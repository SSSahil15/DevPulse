'use strict';

const { ZodError } = require('zod');
const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

// Threshold above which a single request is treated as deliberate probing
const SUSPICIOUS_ERROR_THRESHOLD = 3;

/**
 * Higher-order function that returns an Express middleware to validate request
 * parameters against a provided Zod schema.
 *
 * On failure:
 *  - Emits a structured WARN log (IP, path, failed fields, requestId)
 *  - Captures a Sentry warning when errorCount >= SUSPICIOUS_ERROR_THRESHOLD
 *    (indicates likely fuzzing or automated probing)
 *  - Returns 400 JSON: { message, requestId, errors[] }
 *
 * On success:
 *  - Replaces req[property] with the parsed (trimmed / coerced / defaulted) data
 *    so downstream handlers always receive clean, typed values.
 *
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"query"|"params"} property
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      req[property] = schema.parse(req[property]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const failedFields = error.errors.map((e) => e.path.join('.'));
        const errorCount = error.errors.length;
        const suspicious = errorCount >= SUSPICIOUS_ERROR_THRESHOLD;

        // ── Structured security log ───────────────────────────────────────────
        logger.warn('[Validation] Request failed validation', {
          requestId: req.requestId || 'no-id',
          ip: req.ip,
          method: req.method,
          path: req.path,
          property,
          userId: req.user?.id || 'anonymous',
          errorCount,
          failedFields,
          suspicious,
          // Truncated snapshot of the offending value (never log full body)
          valueSample: (() => {
            try {
              const raw = req[property];
              const str = JSON.stringify(raw);
              return str.length > 120 ? str.slice(0, 120) + '…' : str;
            } catch {
              return '[unserializable]';
            }
          })(),
        });

        // ── Sentry capture for probable probing ───────────────────────────────
        if (suspicious) {
          Sentry.withScope((scope) => {
            scope.setTag('type', 'validation_probe');
            scope.setTag('path', req.path);
            scope.setExtra('failedFields', failedFields);
            scope.setExtra('errorCount', errorCount);
            scope.setExtra('ip', req.ip);
            Sentry.captureMessage(
              `[Validation] Suspicious request: ${errorCount} errors on ${req.method} ${req.path}`,
              'warning',
            );
          });
        }

        // ── 400 response ──────────────────────────────────────────────────────
        return res.status(400).json({
          message: 'Validation failed',
          requestId: req.requestId,
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
