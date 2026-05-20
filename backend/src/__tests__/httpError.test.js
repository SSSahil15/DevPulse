/**
 * httpError.test.js
 * =================
 * Tests for the createHttpError utility and isHttpError type-guard.
 */

const createHttpError = require("../utils/httpError");
const { isHttpError } = require("../utils/httpError");

describe("createHttpError", () => {
  it("creates an Error instance", () => {
    const err = createHttpError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
  });

  it("sets the message correctly", () => {
    const err = createHttpError(400, "Bad request");
    expect(err.message).toBe("Bad request");
  });

  it("sets the statusCode correctly", () => {
    const err = createHttpError(422, "Unprocessable");
    expect(err.statusCode).toBe(422);
  });

  it("sets isOperational to true", () => {
    const err = createHttpError(401, "Unauthorized");
    expect(err.isOperational).toBe(true);
  });

  it("works for all common HTTP codes", () => {
    [400, 401, 403, 404, 409, 422, 429, 500, 502, 503].forEach((code) => {
      const err = createHttpError(code, `Error ${code}`);
      expect(err.statusCode).toBe(code);
      expect(err.isOperational).toBe(true);
    });
  });
});

describe("isHttpError", () => {
  it("returns true for errors created by createHttpError", () => {
    const err = createHttpError(404, "Not found");
    expect(isHttpError(err)).toBe(true);
  });

  it("returns false for plain Error objects", () => {
    const err = new Error("Plain error");
    expect(isHttpError(err)).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isHttpError(null)).toBe(false);
    expect(isHttpError(undefined)).toBe(false);
    expect(isHttpError("string")).toBe(false);
    expect(isHttpError(42)).toBe(false);
    expect(isHttpError({ message: "fake" })).toBe(false);
  });

  it("returns false for errors with isOperational explicitly set to false", () => {
    const err = new Error("bug");
    err.isOperational = false;
    expect(isHttpError(err)).toBe(false);
  });
});
