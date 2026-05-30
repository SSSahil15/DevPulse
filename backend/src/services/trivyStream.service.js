const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const util = require('util');
const execFilePromise = util.promisify(execFile);

const SCANS_DIR = path.join(__dirname, '../../.temp_scans');

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

/**
 * Streaming wrapper around Trivy that fires progress callbacks
 * as each result file and vulnerability is processed.
 *
 * This replaces direct `runTrivyScan` calls in the scan worker
 * when real-time streaming is required.
 *
 * @param {string}   repositoryFullName  "owner/repo"
 * @param {string}   githubToken         GitHub access token
 * @param {object}   callbacks           Event callbacks
 * @param {Function} callbacks.onCloneStarted       ()
 * @param {Function} callbacks.onCloneComplete       ()
 * @param {Function} callbacks.onScanStarted         ()
 * @param {Function} callbacks.onDependencyAnalyzed  (target, vulnCount, ecosystem)
 * @param {Function} callbacks.onVulnerabilityFound  (vuln)
 * @param {Function} callbacks.onScanComplete         (result)
 * @param {Function} callbacks.onError               (error)
 * @returns {Promise<object>}  Full scan result (same shape as `runTrivyScan`)
 */
async function runTrivyScanWithStream(repositoryFullName, githubToken, callbacks = {}) {
  const {
    onCloneStarted = () => {},
    onCloneComplete = () => {},
    onScanStarted = () => {},
    onDependencyAnalyzed = () => {},
    onVulnerabilityFound = () => {},
    onScanComplete = () => {},
    onError = () => {},
  } = callbacks;

  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repositoryFullName)) {
    const err = { message: 'Invalid repository full name.' };
    onError(err);
    return emptyScanResult('Invalid repository full name.');
  }

  const scanId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const repoPath = path.join(SCANS_DIR, scanId);
  const cloneUrl = `https://github.com/${repositoryFullName}.git`;
  const authHeader = Buffer.from(`x-access-token:${githubToken}`, 'utf8').toString('base64');

  try {
    await fs.mkdir(SCANS_DIR, { recursive: true });

    // ── Phase 1: Clone ────────────────────────────────────────────────────────
    await onCloneStarted();
    await execFilePromise(
      'git',
      [
        '-c',
        `http.https://github.com/.extraheader=AUTHORIZATION: basic ${authHeader}`,
        'clone',
        '--depth',
        '1',
        cloneUrl,
        repoPath,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    await onCloneComplete();

    // ── Phase 2: Trivy ────────────────────────────────────────────────────────
    await onScanStarted();
    const { stdout } = await execFilePromise('trivy', ['repo', '--format', 'json', repoPath], {
      maxBuffer: 20 * 1024 * 1024,
    });

    const trivyOutput = JSON.parse(stdout);
    const result = await parseAndStream(trivyOutput, onDependencyAnalyzed, onVulnerabilityFound);

    await onScanComplete(result);
    return result;
  } catch (error) {
    const msg = error.message || 'Security scan failed';
    await onError({ message: msg });
    return emptyScanResult(msg);
  } finally {
    // Always clean up cloned repo
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch {
      /* non-fatal */
    }
  }
}

/**
 * Parses Trivy JSON output and fires per-dependency and per-CVE callbacks
 * BEFORE returning the aggregate result. This is what makes the scan "stream".
 */
async function parseAndStream(output, onDependencyAnalyzed, onVulnerabilityFound) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  const vulnerabilities = [];

  if (!output.Results) {
    return { status: 'completed', severityScore: 0, summary, vulnerabilities };
  }

  for (const result of output.Results) {
    const lowerClass = (result.Type || result.Target || '').toLowerCase();
    let ecosystem = 'unknown';
    for (const [key, eco] of Object.entries(ECOSYSTEM_MAP)) {
      if (lowerClass.includes(key)) {
        ecosystem = eco;
        break;
      }
    }

    const resultVulns = result.Vulnerabilities || [];

    // Await per-dependency event so socket emissions are flushed
    await onDependencyAnalyzed(result.Target || 'unknown', resultVulns.length, ecosystem);

    for (const vuln of resultVulns) {
      const severity = (vuln.Severity || 'unknown').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(summary, severity)) {
        summary[severity]++;
      } else {
        summary.unknown++;
      }

      const vulnRecord = {
        id: vuln.VulnerabilityID,
        title: vuln.Title,
        severity: vuln.Severity,
        pkgName: vuln.PkgName,
        installedVersion: vuln.InstalledVersion,
        fixedVersion: vuln.FixedVersion,
        target: result.Target || null,
        ecosystem,
        description: vuln.Description || '',
        references: vuln.References || [],
        cvssScore: vuln.CVSS?.nvd?.V3Score || vuln.CVSS?.redhat?.V3Score || null,
      };

      vulnerabilities.push(vulnRecord);

      // Await per-CVE event so socket emissions are flushed
      await onVulnerabilityFound(vulnRecord);
    }
  }

  const severityScore = Math.min(
    summary.critical * 25 + summary.high * 10 + summary.medium * 3,
    100,
  );

  return { status: 'completed', severityScore, summary, vulnerabilities };
}

function emptyScanResult(errorMsg) {
  return {
    status: 'error',
    severityScore: 0,
    summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    vulnerabilities: [],
    error: errorMsg,
  };
}

module.exports = { runTrivyScanWithStream };
