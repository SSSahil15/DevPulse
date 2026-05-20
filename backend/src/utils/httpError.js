/**
 * createHttpError — creates an operational HTTP error.
 *
 * "Operational" means the error is expected and user-facing (e.g. 400 Bad Request,
 * 401 Unauthorized, 404 Not Found). The global error handler logs these at WARN level.
 *
 * Errors that are NOT operational (programming bugs, unexpected failures) will have
 * isOperational=false (or undefined) and are logged at ERROR level + sent to Sentry.
 *
 * @param {number} statusCode - HTTP status code (4xx or 5xx)
 * @param {string} message    - User-facing error message
 * @returns {Error}
 */
function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode    = statusCode;
  error.isOperational = true;   // Safe, expected error — not a bug
  return error;
}

/**
 * Type guard — returns true if the error was created by createHttpError.
 * @param {unknown} err
 * @returns {boolean}
 */
function isHttpError(err) {
  return err instanceof Error && err.isOperational === true;
}

module.exports = createHttpError;
module.exports.isHttpError = isHttpError;


