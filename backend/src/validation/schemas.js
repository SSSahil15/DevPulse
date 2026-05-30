/**
 * @file src/validation/schemas.js
 *
 * Centralised reusable Zod building blocks for DevPulse input validation.
 *
 * Design principles:
 *  - Every exported helper is a fully-formed ZodType, not a factory, so they
 *    compose naturally with .optional(), .nullable(), .refine(), etc.
 *  - Strings are always .trim()med before length checks so whitespace-only
 *    inputs are caught correctly.
 *  - Malicious-content checks are kept in one place (isMalicious / DANGER_PATTERNS)
 *    so the block-list is easy to update centrally.
 */

'use strict';

const { z } = require('zod');

// ─── Block-list Patterns ──────────────────────────────────────────────────────
// Patterns that indicate injection or XSS probing.
// These are intentionally coarse — false positives on real user content are
// acceptable because all these fields are structured data, not free-form prose.

const DANGER_PATTERNS = [
  /<[a-z!/?]/i, // HTML / XML tags
  /javascript\s*:/i, // javascript: URI
  /on\w+\s*=/i, // inline event handlers (onclick=, onerror=, …)
  /\bSELECT\b.*\bFROM\b/i, // SQL SELECT … FROM
  /\bDROP\s+TABLE\b/i, // SQL DROP TABLE
  /\bINSERT\s+INTO\b/i, // SQL INSERT INTO
  /\bUNION\s+SELECT\b/i, // SQL UNION SELECT
  /--\s*$/m, // SQL comment suffix
  /\u0000/, // null byte
  /\.\.\//, // path traversal
];

/**
 * Returns true if the value contains a known injection / XSS pattern.
 * @param {string} val
 */
function isMalicious(val) {
  return DANGER_PATTERNS.some((re) => re.test(val));
}

// ─── Reusable Primitives ──────────────────────────────────────────────────────

/**
 * A safe, bounded string schema.
 *
 * - Trims whitespace
 * - Rejects empty strings
 * - Enforces a caller-supplied max length
 * - Blocks known injection / XSS patterns
 *
 * @param {number} [maxLen=500]
 * @param {string} [label="Value"]
 */
function safeStringSchema(maxLen = 500, label = 'Value') {
  return z
    .string()
    .trim()
    .min(1, `${label} cannot be empty.`)
    .max(maxLen, `${label} must be at most ${maxLen} characters.`)
    .refine((val) => !isMalicious(val), {
      message: `${label} contains disallowed content.`,
    });
}

/**
 * GitHub repository "owner/repo" full name.
 * - Allows alphanumeric, hyphens, underscores, dots in each segment
 * - Max 200 chars total (GitHub's own limit)
 * - Explicitly blocks traversal characters and injection patterns
 */
const githubFullNameSchema = z
  .string()
  .trim()
  .min(3, 'Repository name must be at least 3 characters.')
  .max(200, 'Repository name must be at most 200 characters.')
  .regex(
    /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
    "Must be in 'owner/repo' format (alphanumeric, hyphens, underscores, dots only).",
  )
  .refine((val) => !val.includes('..'), 'Path traversal is not allowed.')
  .refine((val) => !isMalicious(val), 'Repository name contains disallowed content.');

/**
 * GitHub repository URL.
 * - Must be a valid URL
 * - Hostname must be github.com (blocks SSRF to internal services)
 * - Path must have at least owner + repo segments
 */
const githubUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL.')
  .refine((val) => {
    try {
      const u = new URL(val);
      return u.hostname === 'github.com' || u.hostname === 'www.github.com';
    } catch {
      return false;
    }
  }, 'URL must point to github.com.')
  .refine((val) => {
    try {
      const parts = new URL(val).pathname.split('/').filter(Boolean);
      return parts.length >= 2;
    } catch {
      return false;
    }
  }, 'GitHub URL must include owner and repository (e.g. https://github.com/owner/repo).');

/**
 * Pagination query parameters.
 * Coerces string query params to integers and caps page/limit.
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Standard UUID v4 (e.g. pipeline result IDs, job IDs stored in DB).
 */
const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Must be a valid UUID v4.',
  );

/**
 * DevPulse scan job ID  (format: job_<16 lowercase hex chars>).
 */
const jobIdSchema = z
  .string()
  .trim()
  .regex(/^job_[a-z0-9]{16}$/, 'Invalid job ID format.');

/**
 * Git commit SHA (40-char hex string).
 */
const commitShaSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{40}$/i, 'commitSha must be a 40-character hex string.');

/**
 * Simple email schema — validates format and enforces a reasonable length cap.
 */
const emailSchema = z
  .string()
  .trim()
  .email('Must be a valid email address.')
  .max(254, 'Email must be at most 254 characters.');

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  safeStringSchema,
  githubFullNameSchema,
  githubUrlSchema,
  paginationSchema,
  uuidSchema,
  jobIdSchema,
  commitShaSchema,
  emailSchema,
  isMalicious,
  DANGER_PATTERNS,
};
