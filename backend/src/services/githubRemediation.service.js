const logger = require('../utils/logger');

// ─── GitHub REST API client (reuse existing factory pattern) ──────────────────
const { createGitHubClient } = require('./github.service');

// ─── Scope Verification ───────────────────────────────────────────────────────

/**
 * Verify the GitHub token has 'repo' write scope.
 * Reads the X-OAuth-Scopes header from /user endpoint.
 * Throws a structured error if write scope is missing.
 */
async function verifyWriteScope(accessToken) {
  const axios = require('axios');

  const response = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'DevPulse',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    timeout: 8000,
  });

  const scopeHeader = response.headers['x-oauth-scopes'] || '';
  const scopes = scopeHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // 'repo' gives full access; 'public_repo' covers public repos only
  const hasWrite = scopes.includes('repo') || scopes.includes('public_repo');

  if (!hasWrite) {
    const err = new Error(
      "GitHub token lacks write scope. Re-authenticate with 'repo' permission to create branches and pull requests.",
    );
    err.code = 'INSUFFICIENT_GITHUB_SCOPE';
    err.currentScopes = scopes;
    err.requiredScopes = ['repo'];
    throw err;
  }

  logger.info('[GitHubRemediation] Token scope verified', { scopes });
  return scopes;
}

// ─── Rate Limit Guard ─────────────────────────────────────────────────────────

async function checkRateLimit(client) {
  const response = await client.get('/rate_limit');
  const remaining = response.data?.resources?.core?.remaining ?? 0;

  if (remaining < 50) {
    const resetAt = new Date(response.data?.resources?.core?.reset * 1000).toISOString();
    const err = new Error(
      `GitHub API rate limit too low (${remaining} remaining). Resets at ${resetAt}.`,
    );
    err.code = 'RATE_LIMIT_LOW';
    err.remaining = remaining;
    err.resetAt = resetAt;
    throw err;
  }

  logger.info(`[GitHubRemediation] Rate limit OK: ${remaining} requests remaining`);
  return remaining;
}

// ─── File Content Fetcher ─────────────────────────────────────────────────────

/**
 * Fetch a file's content and SHA from GitHub (needed for commits).
 */
async function getFileContent(client, repoFullName, filePath) {
  try {
    const response = await client.get(
      `/repos/${repoFullName}/contents/${encodeURIComponent(filePath)}`,
    );

    const content = Buffer.from(response.data.content, 'base64').toString('utf8');
    return {
      content,
      sha: response.data.sha,
      path: response.data.path,
      found: true,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { content: null, sha: null, path: filePath, found: false };
    }
    throw err;
  }
}

// ─── Manifest Discovery ───────────────────────────────────────────────────────

const MANIFEST_FILES = {
  npm: ['package.json'],
  pip: ['requirements.txt', 'requirements/base.txt', 'requirements/prod.txt'],
};

/**
 * Discover which manifest files exist in the repository.
 * Returns a map of ecosystem → [{ path, content, sha }]
 */
async function discoverManifests(client, repoFullName, ecosystems) {
  const result = {};

  let defaultBranch = 'main';
  try {
    const repoResp = await client.get(`/repos/${repoFullName}`);
    defaultBranch = repoResp.data.default_branch || 'main';
  } catch (e) {
    /* ignore */
  }

  let treeFiles = [];
  try {
    const treeResp = await client.get(
      `/repos/${repoFullName}/git/trees/${defaultBranch}?recursive=1`,
    );
    treeFiles = treeResp.data.tree || [];
  } catch (e) {
    /* ignore */
  }

  for (const eco of ecosystems) {
    const candidates = MANIFEST_FILES[eco] || [];
    result[eco] = [];

    const matches = treeFiles.filter(
      (f) => f.type === 'blob' && candidates.some((c) => f.path === c || f.path.endsWith('/' + c)),
    );

    // If recursive tree fails or finds none, fallback to root candidates
    const pathsToFetch = matches.length > 0 ? [...new Set(matches.map((m) => m.path))] : candidates;

    for (const filePath of pathsToFetch) {
      const file = await getFileContent(client, repoFullName, filePath);
      if (file.found) {
        result[eco].push(file);
        logger.info(`[GitHubRemediation] Found ${eco} manifest: ${filePath}`);
      }
    }
  }

  return result;
}

// ─── Dependency Patcher ───────────────────────────────────────────────────────

/**
 * Apply version patches to a manifest file's content string.
 * Supports package.json and requirements.txt.
 */
function applyDependencyPatch(fileContent, patches, ecosystem) {
  let patched = fileContent;
  const appliedPatches = [];

  if (ecosystem === 'npm') {
    // Parse package.json and update version strings
    try {
      const pkg = JSON.parse(fileContent);
      let changed = false;

      for (const patch of patches) {
        const packageName = patch.packageName || patch.pkgName;
        const toVersion = patch.toVersion || patch.resolvedVersion;
        if (!packageName || !toVersion) continue;

        const versionString = `^${toVersion}`;
        let applied = false;

        for (const depField of [
          'dependencies',
          'devDependencies',
          'peerDependencies',
          'optionalDependencies',
        ]) {
          if (pkg[depField]?.[packageName]) {
            const oldVersion = pkg[depField][packageName];
            pkg[depField][packageName] = versionString;
            appliedPatches.push({
              ...patch,
              packageName,
              toVersion,
              field: depField,
              oldRaw: oldVersion,
              newRaw: versionString,
              applied: true,
            });
            changed = true;
            applied = true;
            break;
          }
        }

        if (!applied) {
          if (!pkg.overrides) pkg.overrides = {};
          if (!pkg.resolutions) pkg.resolutions = {};

          const oldRaw = pkg.overrides[packageName] || pkg.resolutions[packageName] || 'none';
          pkg.overrides[packageName] = versionString;
          pkg.resolutions[packageName] = versionString;

          appliedPatches.push({
            ...patch,
            packageName,
            toVersion,
            field: 'overrides/resolutions',
            oldRaw,
            newRaw: versionString,
            applied: true,
          });
          changed = true;
        }
      }

      if (changed) {
        patched = JSON.stringify(pkg, null, 2) + '\n';
      }
    } catch (err) {
      logger.warn(`[GitHubRemediation] Failed to parse package.json: ${err.message}`);
    }
  } else if (ecosystem === 'pip') {
    // Patch requirements.txt line by line
    let lines = fileContent.split('\n');

    for (const patch of patches) {
      const packageName = patch.packageName || patch.pkgName;
      const toVersion = patch.toVersion || patch.resolvedVersion;
      if (!packageName || !toVersion) continue;

      let applied = false;
      lines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        // Match: packageName==x.x.x  or  packageName>=x.x.x  or  packageName
        const pattern = new RegExp(
          `^(${escapeRegex(packageName)})(\\s*[>=<!~^]+\\s*[^\\s,;#]*)?(\\s*[;#].*)?$`,
          'i',
        );
        const match = trimmed.match(pattern);
        if (match) {
          const newLine = `${packageName}==${toVersion}${match[3] || ''}`;
          appliedPatches.push({
            ...patch,
            packageName,
            toVersion,
            oldRaw: line,
            newRaw: newLine,
            applied: true,
          });
          applied = true;
          return newLine;
        }
        return line;
      });

      if (!applied) {
        const newLine = `${packageName}==${toVersion}`;
        if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
          lines.splice(lines.length - 1, 0, newLine);
        } else {
          lines.push(newLine);
        }
        appliedPatches.push({
          ...patch,
          packageName,
          toVersion,
          oldRaw: 'none',
          newRaw: newLine,
          applied: true,
        });
      }
    }

    patched = lines.join('\n');
  }

  return { patched, appliedPatches };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Build Unified Diff ───────────────────────────────────────────────────────

/**
 * Build a simple unified diff string between original and patched content.
 */
function buildDiff(original, patched, filePath) {
  const origLines = original.split('\n');
  const patchedLines = patched.split('\n');
  const diff = [`--- a/${filePath}`, `+++ b/${filePath}`];

  // Simple line-by-line diff (not a full Myers diff — sufficient for manifest files)
  for (let i = 0; i < Math.max(origLines.length, patchedLines.length); i++) {
    const o = origLines[i];
    const p = patchedLines[i];
    if (o === undefined) {
      diff.push(`+${p}`);
    } else if (p === undefined) {
      diff.push(`-${o}`);
    } else if (o !== p) {
      diff.push(`-${o}`);
      diff.push(`+${p}`);
    }
  }

  return diff.join('\n');
}

// ─── Branch Creation ──────────────────────────────────────────────────────────

/**
 * Create a remediation branch from the default branch.
 */
async function createRemediationBranch(client, repoFullName, baseBranch, branchName) {
  // Get the SHA of the tip of the base branch
  const refResponse = await client.get(`/repos/${repoFullName}/git/ref/heads/${baseBranch}`);
  const baseSha = refResponse.data.object.sha;

  // Create the new branch
  await client.post(`/repos/${repoFullName}/git/refs`, {
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  logger.info(
    `[GitHubRemediation] Branch created: ${branchName} (from ${baseBranch}@${baseSha.slice(0, 7)})`,
  );
  return { branchName, baseSha };
}

// ─── Commit Patched Files ─────────────────────────────────────────────────────

/**
 * Commit multiple patched files using GitHub Tree API (no clone needed).
 */
async function commitPatchedFiles(client, repoFullName, branchName, files, commitMessage) {
  // 1. Get latest commit SHA on branch
  const branchResponse = await client.get(`/repos/${repoFullName}/git/ref/heads/${branchName}`);
  const latestCommitSha = branchResponse.data.object.sha;

  // 2. Get the tree SHA of the latest commit
  const commitResponse = await client.get(`/repos/${repoFullName}/git/commits/${latestCommitSha}`);
  const baseTreeSha = commitResponse.data.tree.sha;

  // 3. Create blobs for each patched file
  const treeItems = await Promise.all(
    files.map(async ({ path, content }) => {
      const blobResponse = await client.post(`/repos/${repoFullName}/git/blobs`, {
        content: Buffer.from(content, 'utf8').toString('base64'),
        encoding: 'base64',
      });
      return {
        path,
        mode: '100644',
        type: 'blob',
        sha: blobResponse.data.sha,
      };
    }),
  );

  // 4. Create a new tree
  const treeResponse = await client.post(`/repos/${repoFullName}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // 5. Create a commit
  const newCommit = await client.post(`/repos/${repoFullName}/git/commits`, {
    message: commitMessage,
    tree: treeResponse.data.sha,
    parents: [latestCommitSha],
  });

  // 6. Update the branch ref
  await client.patch(`/repos/${repoFullName}/git/refs/heads/${branchName}`, {
    sha: newCommit.data.sha,
  });

  logger.info(
    `[GitHubRemediation] Committed ${files.length} files to ${branchName} (${newCommit.data.sha.slice(0, 7)})`,
  );
  return { commitSha: newCommit.data.sha };
}

// ─── Open Pull Request ────────────────────────────────────────────────────────

/**
 * Open a GitHub Pull Request with AI-generated title and description.
 */
async function openPullRequest(client, repoFullName, branchName, baseBranch, prTitle, prBody) {
  const response = await client.post(`/repos/${repoFullName}/pulls`, {
    title: prTitle,
    body: prBody,
    head: branchName,
    base: baseBranch,
    draft: false,
  });

  const pr = response.data;

  // Add labels (best-effort — labels may not exist)
  try {
    await client.post(`/repos/${repoFullName}/issues/${pr.number}/labels`, {
      labels: ['security', 'dependencies', 'devpulse-fix'],
    });
  } catch {
    // Labels may not exist — non-fatal
  }

  logger.info(`[GitHubRemediation] PR opened: #${pr.number} — ${pr.html_url}`);
  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    prTitle: pr.title,
    branchName,
    state: pr.state,
  };
}

// ─── Rollback Branch ─────────────────────────────────────────────────────────

/**
 * Delete a remediation branch on failure (safety rollback).
 */
async function rollbackBranch(client, repoFullName, branchName) {
  try {
    await client.delete(`/repos/${repoFullName}/git/refs/heads/${branchName}`);
    logger.info(`[GitHubRemediation] Rolled back branch: ${branchName}`);
  } catch (err) {
    logger.warn(`[GitHubRemediation] Rollback failed for ${branchName}: ${err.message}`);
  }
}

// ─── Get Default Branch ───────────────────────────────────────────────────────

async function getDefaultBranch(client, repoFullName) {
  const response = await client.get(`/repos/${repoFullName}`);
  return response.data.default_branch || 'main';
}

module.exports = {
  verifyWriteScope,
  checkRateLimit,
  getFileContent,
  discoverManifests,
  applyDependencyPatch,
  buildDiff,
  createRemediationBranch,
  commitPatchedFiles,
  openPullRequest,
  rollbackBranch,
  getDefaultBranch,
};
