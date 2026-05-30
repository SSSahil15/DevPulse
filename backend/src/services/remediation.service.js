const axios = require('axios');
const logger = require('../utils/logger');

// ─── Ecosystem Detection ───────────────────────────────────────────────────────

const ECOSYSTEM_MAP = {
  node_modules: 'npm',
  npm: 'npm',
  pip: 'pip',
  pipenv: 'pip',
  poetry: 'pip',
  cargo: 'cargo',
  gem: 'gem',
  go: 'go',
  maven: 'maven',
  nuget: 'nuget',
};

function detectEcosystem(trivyType) {
  if (!trivyType) return 'unknown';
  const lower = trivyType.toLowerCase();
  for (const [key, eco] of Object.entries(ECOSYSTEM_MAP)) {
    if (lower.includes(key)) return eco;
  }
  return 'unknown';
}

// ─── Trivy Vulnerability Parser ───────────────────────────────────────────────

/**
 * Parse Trivy JSON output — returns ALL vulnerabilities (no cap).
 * Each vulnerability is enriched with ecosystem + remediation metadata.
 * Supports both raw Trivy output and database simplified stages.security format.
 *
 * @param {object} trivyOutput - Parsed Trivy JSON or stages.security object
 * @returns {ParsedScanResult}
 */
function parseTrivyVulnerabilities(trivyOutput) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  const vulnerabilities = [];
  const ecosystems = new Set();

  if (!trivyOutput) {
    return { summary, vulnerabilities, ecosystems: [] };
  }

  // Handle database simplified format (has vulnerabilities array)
  if (Array.isArray(trivyOutput.vulnerabilities)) {
    trivyOutput.vulnerabilities.forEach((vuln) => {
      const severity = (vuln.severity || 'unknown').toLowerCase();
      if (severity in summary) {
        summary[severity]++;
      } else {
        summary.unknown++;
      }

      let ecosystem = vuln.ecosystem || 'unknown';
      if (ecosystem === 'unknown' && vuln.target) {
        ecosystem = detectEcosystem(vuln.target);
      }
      if (ecosystem === 'unknown') {
        if (
          vuln.pkgName &&
          (vuln.pkgName.startsWith('@') ||
            ['express', 'lodash', 'react', 'next', 'vite', 'axios', 'zod'].includes(vuln.pkgName))
        ) {
          ecosystem = 'npm';
        } else if (
          vuln.pkgName &&
          ['django', 'flask', 'requests', 'numpy', 'pandas', 'jinja2'].includes(vuln.pkgName)
        ) {
          ecosystem = 'pip';
        } else {
          ecosystem = 'npm'; // fallback
        }
      }

      if (ecosystem !== 'unknown') ecosystems.add(ecosystem);

      const hasFixedVersion = !!(vuln.fixedVersion && vuln.fixedVersion.trim());

      vulnerabilities.push({
        id: vuln.id || vuln.VulnerabilityID,
        title: vuln.title || `${vuln.id || vuln.VulnerabilityID} in ${vuln.pkgName}`,
        description: vuln.description || '',
        severity: vuln.severity || 'UNKNOWN',
        pkgName: vuln.pkgName,
        installedVersion: vuln.installedVersion,
        fixedVersion: vuln.fixedVersion || null,
        hasFixedVersion,
        ecosystem,
        target: vuln.target || (ecosystem === 'npm' ? 'package.json' : 'requirements.txt'),
        references: vuln.references || [],
        cvssScore: vuln.cvssScore || null,
        publishedDate: vuln.publishedDate || null,
        resolvedVersion: null,
        breakingRisk: null,
        confidenceScore: null,
      });
    });

    const severityScore = Math.min(
      summary.critical * 25 + summary.high * 10 + summary.medium * 3,
      100,
    );

    return {
      summary,
      vulnerabilities,
      ecosystems: [...ecosystems],
      severityScore,
      totalFixable: vulnerabilities.filter((v) => v.hasFixedVersion).length,
    };
  }

  // Handle standard raw Trivy JSON output
  if (trivyOutput.Results) {
    trivyOutput.Results.forEach((result) => {
      const ecosystem = detectEcosystem(result.Type || result.Target || '');
      if (ecosystem !== 'unknown') ecosystems.add(ecosystem);

      (result.Vulnerabilities || []).forEach((vuln) => {
        const severity = (vuln.Severity || 'unknown').toLowerCase();
        if (severity in summary) {
          summary[severity]++;
        } else {
          summary.unknown++;
        }

        const hasFixedVersion = !!(vuln.FixedVersion && vuln.FixedVersion.trim());

        vulnerabilities.push({
          id: vuln.VulnerabilityID,
          title: vuln.Title || `${vuln.VulnerabilityID} in ${vuln.PkgName}`,
          description: vuln.Description || '',
          severity: vuln.Severity || 'UNKNOWN',
          pkgName: vuln.PkgName,
          installedVersion: vuln.InstalledVersion,
          fixedVersion: vuln.FixedVersion || null,
          hasFixedVersion,
          ecosystem,
          target: result.Target,
          references: vuln.References || [],
          cvssScore: vuln.CVSS?.nvd?.V3Score || vuln.CVSS?.redhat?.V3Score || null,
          publishedDate: vuln.PublishedDate || null,
          resolvedVersion: null,
          breakingRisk: null,
          confidenceScore: null,
        });
      });
    });

    const severityScore = Math.min(
      summary.critical * 25 + summary.high * 10 + summary.medium * 3,
      100,
    );

    return {
      summary,
      vulnerabilities,
      ecosystems: [...ecosystems],
      severityScore,
      totalFixable: vulnerabilities.filter((v) => v.hasFixedVersion).length,
    };
  }

  return { summary, vulnerabilities, ecosystems: [] };
}

// ─── Ecosystem Grouping ────────────────────────────────────────────────────────

/**
 * Group vulnerabilities by ecosystem for targeted patching.
 * Only returns groups for supported ecosystems.
 */
function groupByEcosystem(vulnerabilities) {
  const supported = ['npm', 'pip'];
  const groups = {};

  for (const vuln of vulnerabilities) {
    if (!supported.includes(vuln.ecosystem)) continue;
    if (!vuln.hasFixedVersion) continue;
    if (!groups[vuln.ecosystem]) groups[vuln.ecosystem] = [];
    groups[vuln.ecosystem].push(vuln);
  }

  return groups;
}

// ─── Semver Compatibility ─────────────────────────────────────────────────────

/**
 * Parse a semver-like version string into [major, minor, patch].
 * Handles versions like "1.2.3", "^1.2.3", ">=1.0.0", "1.2.3-beta.1"
 */
function parseSemver(version) {
  if (!version) return [0, 0, 0];
  const clean = version.replace(/^[^0-9]*/, '').split('-')[0];
  const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Estimate breaking-change risk for an upgrade.
 * Returns: { risk: 'LOW'|'MEDIUM'|'HIGH', reason: string }
 */
function estimateBreakingRisk(currentVersion, targetVersion) {
  if (!currentVersion || !targetVersion) {
    return { risk: 'MEDIUM', reason: 'Unable to compare versions — manual review recommended.' };
  }

  const [curMajor, curMinor] = parseSemver(currentVersion);
  const [tgtMajor, tgtMinor] = parseSemver(targetVersion);

  if (tgtMajor > curMajor) {
    return {
      risk: 'HIGH',
      reason: `Major version bump (${curMajor} → ${tgtMajor}): likely contains breaking API changes. Review changelog before merging.`,
    };
  }

  if (tgtMinor > curMinor) {
    return {
      risk: 'MEDIUM',
      reason: `Minor version bump (${curMinor} → ${tgtMinor}): may introduce new APIs but should be backward-compatible. Test before merging.`,
    };
  }

  return {
    risk: 'LOW',
    reason: `Patch-level upgrade — backward-compatible bug/security fix. Safe to merge.`,
  };
}

// ─── Confidence Scoring ───────────────────────────────────────────────────────

/**
 * Score confidence (0–100) that the suggested fix is safe.
 */
function scoreConfidence(vuln) {
  if (!vuln.hasFixedVersion || !vuln.fixedVersion) return 20;

  const { risk } = estimateBreakingRisk(vuln.installedVersion, vuln.fixedVersion);
  if (risk === 'LOW') return 95;
  if (risk === 'MEDIUM') return 70;
  if (risk === 'HIGH') return 45;
  return 30;
}

// ─── npm Registry Resolution ──────────────────────────────────────────────────

async function resolveNpmVersion(packageName, requestedVersion) {
  try {
    const response = await axios.get(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      { timeout: 5000, headers: { Accept: 'application/vnd.npm.install-v1+json' } },
    );

    const distTags = response.data['dist-tags'] || {};
    const versions = Object.keys(response.data.versions || {});

    // Try exact fixedVersion first
    if (requestedVersion && versions.includes(requestedVersion)) {
      return requestedVersion;
    }

    // Fallback to latest
    return distTags.latest || requestedVersion;
  } catch (err) {
    logger.warn(`[Remediation] npm registry lookup failed for ${packageName}: ${err.message}`);
    return requestedVersion; // Fall back to Trivy's fixedVersion
  }
}

// ─── PyPI Registry Resolution ─────────────────────────────────────────────────

async function resolvePipVersion(packageName, requestedVersion) {
  try {
    const response = await axios.get(
      `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`,
      { timeout: 5000 },
    );

    const info = response.data.info || {};
    const latestVersion = info.version;

    if (requestedVersion && response.data.releases?.[requestedVersion]) {
      return requestedVersion;
    }

    return latestVersion || requestedVersion;
  } catch (err) {
    logger.warn(`[Remediation] PyPI registry lookup failed for ${packageName}: ${err.message}`);
    return requestedVersion;
  }
}

// ─── Version Resolution Orchestrator ─────────────────────────────────────────

/**
 * Resolve safe upgrade versions for all fixable vulnerabilities.
 * Calls npm/PyPI registries to verify fixedVersion actually exists.
 * Enriches each vuln with resolvedVersion, breakingRisk, confidenceScore.
 *
 * @param {object[]} vulnerabilities
 * @returns {object[]} enriched vulnerabilities
 */
async function resolveUpgradeVersions(vulnerabilities) {
  const concurrencyLimit = 5;
  const enriched = [...vulnerabilities];
  const fixable = enriched.filter((v) => v.hasFixedVersion);

  logger.info(`[Remediation] Resolving versions for ${fixable.length} fixable vulnerabilities`);

  // Process in batches to avoid rate limiting
  for (let i = 0; i < fixable.length; i += concurrencyLimit) {
    const batch = fixable.slice(i, i + concurrencyLimit);

    await Promise.allSettled(
      batch.map(async (vuln) => {
        let resolvedVersion = vuln.fixedVersion;

        if (vuln.ecosystem === 'npm') {
          resolvedVersion = await resolveNpmVersion(vuln.pkgName, vuln.fixedVersion);
        } else if (vuln.ecosystem === 'pip') {
          resolvedVersion = await resolvePipVersion(vuln.pkgName, vuln.fixedVersion);
        }

        const { risk, reason } = estimateBreakingRisk(vuln.installedVersion, resolvedVersion);
        vuln.resolvedVersion = resolvedVersion;
        vuln.breakingRisk = risk;
        vuln.breakingReason = reason;
        vuln.confidenceScore = scoreConfidence({ ...vuln, fixedVersion: resolvedVersion });
      }),
    );
  }

  return enriched;
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/**
 * Deduplicate upgrades — if the same package appears multiple times
 * (multiple CVEs), keep only the highest target version.
 */
function deduplicatePatches(vulnerabilities) {
  const packageMap = {};

  for (const vuln of vulnerabilities) {
    if (!vuln.resolvedVersion || !vuln.hasFixedVersion) continue;
    const key = `${vuln.ecosystem}:${vuln.pkgName}`;

    if (!packageMap[key]) {
      packageMap[key] = vuln;
    } else {
      // Keep the higher target version
      const [existMajor, existMinor, existPatch] = parseSemver(packageMap[key].resolvedVersion);
      const [newMajor, newMinor, newPatch] = parseSemver(vuln.resolvedVersion);
      if (
        newMajor > existMajor ||
        (newMajor === existMajor && newMinor > existMinor) ||
        (newMajor === existMajor && newMinor === existMinor && newPatch > existPatch)
      ) {
        packageMap[key] = vuln;
      }
    }
  }

  return Object.values(packageMap);
}

// ─── Patch Summary ─────────────────────────────────────────────────────────────

/**
 * Build a human-readable patch summary for AI/PR description generation.
 */
function buildPatchSummary(patches) {
  return patches.map((p) => ({
    packageName: p.pkgName,
    ecosystem: p.ecosystem,
    fromVersion: p.installedVersion,
    toVersion: p.resolvedVersion,
    breakingRisk: p.breakingRisk,
    breakingReason: p.breakingReason,
    confidenceScore: p.confidenceScore,
    cveIds: [p.id],
    severity: p.severity,
  }));
}

module.exports = {
  parseTrivyVulnerabilities,
  groupByEcosystem,
  estimateBreakingRisk,
  scoreConfidence,
  resolveUpgradeVersions,
  deduplicatePatches,
  buildPatchSummary,
  detectEcosystem,
};
