/**
 * Email Service — DevPulse transactional email notifications.
 *
 * Uses nodemailer with any SMTP provider (Gmail, SendGrid, Resend, etc.)
 * Gracefully no-ops if SMTP_HOST is not configured — email is always optional.
 */

const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

// ── Transport ─────────────────────────────────────────────────────────────────

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    return null; // SMTP not configured — email silently disabled
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port || 587,
    secure: (config.smtp.port || 587) === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    // Connection pool — reuse connections for burst sends
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  return transporter;
}

// ── Shared HTML Layout ────────────────────────────────────────────────────────

function wrapInLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #080b14;
      color: #CBD5E1;
      padding: 32px 16px;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.2));
      padding: 28px 32px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-text {
      font-size: 20px;
      font-weight: 900;
      background: linear-gradient(90deg, #22D3EE, #3B82F6, #8B5CF6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .body { padding: 32px; }
    .metric-row {
      display: flex;
      gap: 12px;
      margin: 20px 0;
    }
    .metric-card {
      flex: 1;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 4px;
    }
    .metric-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748B;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 900;
      text-decoration: none;
      text-align: center;
      width: 100%;
    }
    .btn-primary {
      background: linear-gradient(135deg, #1d4ed8, #7c3aed);
      color: white;
    }
    .btn-success {
      background: linear-gradient(135deg, #059669, #0d9488);
      color: white;
    }
    .score-safe     { color: #10b981; }
    .score-warning  { color: #f59e0b; }
    .score-risky    { color: #f97316; }
    .score-critical { color: #ef4444; }
    .footer {
      padding: 20px 32px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 11px;
      color: #475569;
      text-align: center;
    }
    .tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .tag-safe     { background: rgba(16,185,129,0.12); color: #10b981; }
    .tag-warning  { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .tag-risky    { background: rgba(249,115,22,0.12); color: #f97316; }
    .tag-critical { background: rgba(239,68,68,0.12);  color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:18px">🛡</span>
      </div>
      <span class="logo-text">DevPulse</span>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      DevPulse Security Intelligence · <a href="${config.frontendUrl}" style="color:#4F46E5">Open Dashboard</a>
      <br>You're receiving this because you triggered a scan. Manage notifications in settings.
    </div>
  </div>
</body>
</html>`;
}

// ── Score colour helper ───────────────────────────────────────────────────────

function scoreClass(score) {
  if (score >= 80) return 'safe';
  if (score >= 55) return 'warning';
  if (score >= 30) return 'risky';
  return 'critical';
}

// ── Send helper ───────────────────────────────────────────────────────────────

async function send({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    logger.debug('[Email] SMTP not configured — skipping email', { to, subject });
    return;
  }

  const from = config.smtp.from || `DevPulse <${config.smtp.user}>`;

  try {
    const info = await t.sendMail({ from, to, subject, html });
    logger.info('[Email] Sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    // Email failures must NEVER crash the application — log and move on
    logger.warn('[Email] Failed to send', { to, subject, error: err.message });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a scan-complete notification.
 *
 * @param {object} opts
 * @param {string} opts.to            - Recipient email
 * @param {string} opts.repository    - e.g. "owner/repo-name"
 * @param {number} opts.score         - DevPulse score 0-100
 * @param {string} opts.status        - "SAFE" | "WARNING" | "RISKY" | "CRITICAL"
 * @param {number} opts.critical      - Critical CVE count
 * @param {number} opts.high          - High CVE count
 * @param {number} opts.medium        - Medium CVE count
 * @param {string} [opts.shareUrl]    - Shareable report URL
 * @param {string} [opts.dashboardUrl]
 */
async function sendScanCompleteEmail({
  to,
  repository,
  score,
  status,
  critical = 0,
  high = 0,
  medium = 0,
  shareUrl,
}) {
  if (!to) return;

  const cls = scoreClass(score);
  const repoName = repository.split('/')[1] || repository;
  const totalVulns = critical + high + medium;
  const dashUrl = shareUrl || config.frontendUrl;

  const html = wrapInLayout(
    `Scan Complete — ${repoName}`,
    `
    <h2 style="font-size:20px;font-weight:900;color:#E2E8F0;margin-bottom:6px">
      Scan Complete
    </h2>
    <p style="color:#64748B;font-size:14px;margin-bottom:20px">
      <strong style="color:#94A3B8">${repository}</strong> has been scanned by DevPulse.
    </p>

    <div class="metric-row">
      <div class="metric-card">
        <div class="metric-value score-${cls}">${score}</div>
        <div class="metric-label">DevPulse Score</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:#ef4444">${critical}</div>
        <div class="metric-label">Critical CVEs</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:#f97316">${high}</div>
        <div class="metric-label">High CVEs</div>
      </div>
    </div>

    <div style="margin-bottom:20px">
      <span class="tag tag-${cls}">${status}</span>
      ${totalVulns > 0 ? `<span style="font-size:13px;color:#94A3B8;margin-left:10px">${totalVulns} vulnerabilities detected</span>` : `<span style="font-size:13px;color:#10b981;margin-left:10px">No vulnerabilities detected</span>`}
    </div>

    ${
      critical > 0 || high > 0
        ? `
    <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:14px;margin-bottom:20px">
      <p style="font-size:12px;color:#fca5a5;font-weight:700">⚠️ ${critical} critical and ${high} high severity vulnerabilities require immediate attention.</p>
    </div>`
        : ''
    }

    <a href="${dashUrl}" class="btn btn-primary">
      ${shareUrl ? 'View Full Report →' : 'Open Dashboard →'}
    </a>
  `,
  );

  await send({
    to,
    subject: `[DevPulse] Scan Complete — ${repoName} scored ${score}/100 (${status})`,
    html,
  });
}

/**
 * Send a remediation PR created notification.
 *
 * @param {object} opts
 * @param {string} opts.to            - Recipient email
 * @param {string} opts.repository    - e.g. "owner/repo-name"
 * @param {string} opts.prUrl         - GitHub PR URL
 * @param {number} [opts.prNumber]    - PR number
 * @param {number} [opts.patchCount]  - Number of packages patched
 * @param {string[]} [opts.cveIds]    - CVE IDs that were fixed
 */
async function sendRemediationCompleteEmail({
  to,
  repository,
  prUrl,
  prNumber,
  patchCount = 0,
  cveIds = [],
}) {
  if (!to || !prUrl) return;

  const repoName = repository.split('/')[1] || repository;
  const cveList =
    cveIds.slice(0, 5).join(', ') + (cveIds.length > 5 ? ` +${cveIds.length - 5} more` : '');

  const html = wrapInLayout(
    `Remediation PR Created — ${repoName}`,
    `
    <h2 style="font-size:20px;font-weight:900;color:#E2E8F0;margin-bottom:6px">
      🚀 Pull Request Created
    </h2>
    <p style="color:#64748B;font-size:14px;margin-bottom:20px">
      DevPulse AI Remediation has automatically generated a fix PR for
      <strong style="color:#94A3B8">${repository}</strong>.
    </p>

    <div class="metric-row">
      <div class="metric-card">
        <div class="metric-value" style="color:#10b981">${patchCount}</div>
        <div class="metric-label">Packages Patched</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:#10b981">${cveIds.length}</div>
        <div class="metric-label">CVEs Resolved</div>
      </div>
    </div>

    ${prNumber ? `<p style="font-size:13px;color:#64748B;margin-bottom:8px">PR <strong style="color:#94A3B8">#${prNumber}</strong> is now open and ready for review.</p>` : ''}
    ${cveList ? `<p style="font-size:12px;color:#64748B;margin-bottom:16px;font-family:monospace">${cveList}</p>` : ''}

    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:14px;margin-bottom:20px">
      <p style="font-size:12px;color:#6ee7b7;font-weight:700">✅ Review the diff carefully before merging. AI patches resolve version constraints but you should verify compatibility.</p>
    </div>

    <a href="${prUrl}" class="btn btn-success">
      Review Pull Request on GitHub →
    </a>
  `,
  );

  await send({
    to,
    subject: `[DevPulse] PR Created — ${patchCount} package(s) patched in ${repoName}`,
    html,
  });
}

module.exports = { sendScanCompleteEmail, sendRemediationCompleteEmail };
