const logger = require('../utils/logger');

/**
 * AI Remediation Service
 * Uses Groq (llama-3.3-70b) to generate vulnerability explanations,
 * PR descriptions, commit messages, and confidence-scored remediation summaries.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─── Core LLM Caller ─────────────────────────────────────────────────────────

async function callGroq(systemPrompt, userPrompt, { maxTokens = 800, temperature = 0.2 } = {}) {
  const axios = require('axios');
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const startMs = Date.now();

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 12000,
    },
  );

  const content = response.data.choices[0].message.content;
  const parsed = JSON.parse(content);
  const tokens = response.data.usage?.total_tokens ?? null;
  const durationMs = Date.now() - startMs;

  logger.info('[AI Remediation] Groq call succeeded', {
    model: GROQ_MODEL,
    duration_ms: durationMs,
    tokens_used: tokens,
  });

  return parsed;
}

// ─── Sanitise vuln data before sending to LLM ────────────────────────────────
// Never send auth tokens, file paths, or internal infrastructure details.

function sanitiseVuln(vuln) {
  return {
    id: vuln.id,
    title: vuln.title,
    severity: vuln.severity,
    pkgName: vuln.pkgName,
    installedVersion: vuln.installedVersion,
    fixedVersion: vuln.fixedVersion || 'No fix available',
    cvssScore: vuln.cvssScore,
    description: (vuln.description || '').substring(0, 500),
  };
}

// ─── 1. Explain a Single Vulnerability ───────────────────────────────────────

/**
 * Generate a detailed, developer-friendly explanation of a single CVE.
 * Returns { impact, exploitScenario, attackVector, remediationSteps, urgency }
 */
async function explainVulnerability(vuln) {
  const safe = sanitiseVuln(vuln);

  const systemPrompt = `You are a senior security engineer specialising in software supply chain vulnerabilities.
Respond ONLY in valid JSON. Keep explanations concise (under 80 words per field) but precise and actionable.
Never include usernames, tokens, or file system paths in your output.`;

  const userPrompt = `Explain this vulnerability for a developer who needs to fix it urgently:

CVE: ${safe.id}
Package: ${safe.pkgName} v${safe.installedVersion}
Severity: ${safe.severity} (CVSS: ${safe.cvssScore ?? 'N/A'})
Title: ${safe.title}
Fixed Version: ${safe.fixedVersion}
Description: ${safe.description}

Return JSON:
{
  "impact": "What can an attacker do if this is exploited? (1-2 sentences)",
  "exploitScenario": "Real-world exploit scenario relevant to most apps (1-2 sentences)",
  "attackVector": "NETWORK|LOCAL|PHYSICAL",
  "remediationSteps": ["step 1", "step 2", "step 3"],
  "urgency": "IMMEDIATE|SOON|SCHEDULED",
  "tldr": "One-sentence plain-English summary for non-security engineers"
}`;

  try {
    return await callGroq(systemPrompt, userPrompt, { maxTokens: 600 });
  } catch (err) {
    logger.warn(`[AI Remediation] explainVulnerability fallback for ${vuln.id}: ${err.message}`);
    return {
      impact: `${vuln.severity} severity vulnerability in ${vuln.pkgName}. Upgrade to ${vuln.fixedVersion || 'latest secure version'} to remediate.`,
      exploitScenario:
        'Consult the CVE details at the official NVD database for exploit specifics.',
      attackVector: 'NETWORK',
      remediationSteps: [
        `Upgrade ${vuln.pkgName} from ${vuln.installedVersion} to ${vuln.fixedVersion || 'latest'}.`,
      ],
      urgency: vuln.severity === 'CRITICAL' || vuln.severity === 'HIGH' ? 'IMMEDIATE' : 'SOON',
      tldr: `${vuln.pkgName} has a ${vuln.severity.toLowerCase()} security issue. Update to ${vuln.fixedVersion || 'latest'}.`,
    };
  }
}

// ─── 2. Generate Remediation Summary ─────────────────────────────────────────

/**
 * Generate a consolidated remediation summary for multiple vulnerabilities.
 * Returns { headline, overallRisk, patches: [...], nextSteps }
 */
async function generateRemediationSummary(patches) {
  if (!patches || patches.length === 0) {
    return {
      headline: 'No patchable vulnerabilities found.',
      overallRisk: 'LOW',
      patches: [],
      nextSteps: ['Run a full security audit for non-fixable issues.'],
    };
  }

  const patchList = patches
    .slice(0, 20)
    .map(
      (p) =>
        `${p.packageName} ${p.fromVersion} → ${p.toVersion} (${p.severity}, risk: ${p.breakingRisk})`,
    )
    .join('\n');

  const systemPrompt = `You are a DevSecOps automation system generating remediation summaries.
Be concise, technical, and accurate. Respond ONLY in valid JSON.`;

  const userPrompt = `Generate a remediation summary for these dependency upgrades:

${patchList}

Return JSON:
{
  "headline": "One-line summary of what this PR fixes (e.g. 'Fix 5 critical CVEs in 3 dependencies')",
  "overallRisk": "LOW|MEDIUM|HIGH",
  "riskRationale": "Why this risk level? (1 sentence)",
  "keyPatches": ["Most important 3 patches with rationale"],
  "nextSteps": ["Post-merge steps (run npm install, test suite, etc.)"],
  "estimatedImpact": "What improves after merging? (1 sentence)"
}`;

  try {
    return await callGroq(systemPrompt, userPrompt, { maxTokens: 700 });
  } catch (err) {
    logger.warn(`[AI Remediation] generateRemediationSummary fallback: ${err.message}`);
    const criticalCount = patches.filter((p) => p.severity === 'CRITICAL').length;
    const highCount = patches.filter((p) => p.severity === 'HIGH').length;
    return {
      headline: `Fix ${patches.length} security vulnerabilities across ${patches.length} packages`,
      overallRisk: criticalCount > 0 ? 'HIGH' : highCount > 0 ? 'MEDIUM' : 'LOW',
      riskRationale: `${criticalCount} critical and ${highCount} high severity CVEs detected.`,
      keyPatches: patches.slice(0, 3).map((p) => `Upgrade ${p.packageName} to ${p.toVersion}`),
      nextSteps: [
        'Run npm install or pip install -r requirements.txt after merging.',
        'Run your full test suite.',
        'Review breaking changes if any major versions changed.',
      ],
      estimatedImpact: `Eliminates ${patches.length} known CVEs from your dependency tree.`,
    };
  }
}

// ─── 3. Generate PR Description ──────────────────────────────────────────────

/**
 * Generate a markdown GitHub PR description.
 */
async function generatePRDescription(repoName, patches, summary) {
  const patchTable = patches
    .slice(0, 20)
    .map(
      (p) =>
        `| \`${p.packageName}\` | \`${p.fromVersion}\` | \`${p.toVersion}\` | ${p.severity} | ${p.breakingRisk} |`,
    )
    .join('\n');

  const systemPrompt = `You are a DevSecOps automation bot generating GitHub Pull Request descriptions.
Write in GitHub Flavored Markdown. Be professional but concise. Include tables and code blocks.
Respond ONLY in valid JSON with a single "body" field containing the full markdown string.`;

  const userPrompt = `Generate a GitHub PR description for this security remediation in repository "${repoName}".

Summary: ${summary?.headline || 'Security dependency upgrades'}
Overall Risk: ${summary?.overallRisk || 'MEDIUM'}

Patches:
| Package | From | To | Severity | Breaking Risk |
|---------|------|----|----------|---------------|
${patchTable}

Next Steps: ${(summary?.nextSteps || []).join(', ')}

Include:
1. What this PR does (1-2 sentences)
2. Vulnerability summary table (use the data above)
3. ⚠️ Breaking change warnings if any HIGH risk patches
4. Testing checklist (run tests, check changelog links)
5. Footer: "Generated by DevPulse AI Remediation Engine 🛡️"

Keep total length under 600 words.`;

  try {
    const result = await callGroq(systemPrompt, userPrompt, { maxTokens: 1000, temperature: 0.3 });
    return result.body || result.description || result.content || String(result);
  } catch (err) {
    logger.warn(`[AI Remediation] generatePRDescription fallback: ${err.message}`);
    return buildFallbackPRDescription(repoName, patches, summary);
  }
}

function buildFallbackPRDescription(repoName, patches, summary) {
  const critical = patches.filter((p) => p.severity === 'CRITICAL').length;
  const high = patches.filter((p) => p.severity === 'HIGH').length;
  const hasBreaking = patches.some((p) => p.breakingRisk === 'HIGH');

  const rows = patches
    .slice(0, 15)
    .map(
      (p) =>
        `| \`${p.packageName}\` | \`${p.fromVersion}\` | \`${p.toVersion}\` | ${p.severity} | ${p.breakingRisk} |`,
    )
    .join('\n');

  return `## 🛡️ Security Remediation: ${summary?.headline || `Fix ${patches.length} CVEs in ${repoName}`}

This PR was automatically generated by **DevPulse AI Remediation Engine** to address ${patches.length} known security vulnerabilities.

### 📊 Summary
- **Critical CVEs fixed:** ${critical}
- **High CVEs fixed:** ${high}
- **Packages updated:** ${patches.length}
- **Overall risk:** ${summary?.overallRisk || 'MEDIUM'}

### 📦 Dependency Changes

| Package | From | To | Severity | Breaking Risk |
|---------|------|----|----------|---------------|
${rows}

${hasBreaking ? `### ⚠️ Breaking Change Warning\nOne or more packages have major version bumps. Review changelogs before merging and run your full test suite.\n` : ''}

### ✅ Checklist Before Merging
- [ ] Run \`npm install\` / \`pip install -r requirements.txt\` locally
- [ ] Run full test suite
- [ ] Review changelogs for any HIGH breaking-risk packages
- [ ] Deploy to staging first

---
*Generated by [DevPulse](https://github.com) AI Remediation Engine 🛡️*`;
}

// ─── 4. Generate Commit Message ───────────────────────────────────────────────

/**
 * Generate a conventional commit message for the patch set.
 */
async function generateCommitMessage(patches) {
  const pkgList = patches
    .slice(0, 5)
    .map((p) => `${p.packageName}@${p.toVersion}`)
    .join(', ');
  const critCount = patches.filter((p) => p.severity === 'CRITICAL').length;

  const systemPrompt = `You generate conventional commit messages for security dependency upgrades.
Format: fix(security): <message>
Respond ONLY in JSON: { "message": "..." }
Keep under 72 characters.`;

  const userPrompt = `Generate a commit message for upgrading these packages to fix security vulnerabilities:
Packages: ${pkgList}
Critical CVEs fixed: ${critCount}
Total patches: ${patches.length}`;

  try {
    const result = await callGroq(systemPrompt, userPrompt, { maxTokens: 100 });
    return result.message || `fix(security): upgrade ${patches.length} vulnerable dependencies`;
  } catch (err) {
    logger.warn(`[AI Remediation] generateCommitMessage fallback: ${err.message}`);
    return `fix(security): upgrade ${patches.length} vulnerable dependencies [DevPulse]`;
  }
}

// ─── 5. Generate Rollback Warning ────────────────────────────────────────────

/**
 * Explain why a major version bump may break things and what to watch for.
 */
async function generateRollbackWarning(patch) {
  const safe = {
    packageName: patch.packageName,
    fromVersion: patch.fromVersion,
    toVersion: patch.toVersion,
    ecosystem: patch.ecosystem,
  };

  const systemPrompt = `You are a senior engineer explaining breaking change risks.
Be specific and actionable. Respond in JSON: { "warning": "...", "checkpoints": ["..."] }`;

  const userPrompt = `${safe.packageName} is being upgraded from ${safe.fromVersion} to ${safe.toVersion} (major version change).
What breaking changes should a developer watch for? What should they test?
Keep "warning" under 60 words and "checkpoints" to 3-4 items.`;

  try {
    return await callGroq(systemPrompt, userPrompt, { maxTokens: 300 });
  } catch (err) {
    return {
      warning: `Major version upgrade of ${safe.packageName} (${safe.fromVersion} → ${safe.toVersion}) may contain breaking API changes.`,
      checkpoints: [
        'Review the package changelog/migration guide',
        'Run full test suite after merging',
        'Check for deprecated API usage in your codebase',
        'Test in staging before production',
      ],
    };
  }
}

module.exports = {
  explainVulnerability,
  generateRemediationSummary,
  generatePRDescription,
  generateCommitMessage,
  generateRollbackWarning,
};
