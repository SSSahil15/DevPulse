/**
 * logger.test.js
 * ==============
 * Tests for the maskSensitive() function exported from logger.js.
 * This is the critical security function that prevents tokens and credentials
 * from appearing in structured log output.
 */

const { maskSensitive } = require("../utils/logger");

describe("maskSensitive", () => {
  describe("top-level sensitive keys", () => {
    const sensitiveKeys = [
      "token", "access_token", "accesstoken",
      "secret", "client_secret",
      "password", "passwd", "pwd",
      "code",
      "authorization",
      "key", "api_key", "apikey",
      "jwt", "refresh_token",
      "encrypted_token", "encryptedtoken",
      "cookie", "session",
    ];

    sensitiveKeys.forEach((key) => {
      it(`redacts "${key}"`, () => {
        const result = maskSensitive({ [key]: "super-secret-value" });
        expect(result[key]).toBe("[REDACTED]");
      });
    });
  });

  describe("case-insensitive matching", () => {
    it("redacts TOKEN (uppercase)", () => {
      const result = maskSensitive({ TOKEN: "abc" });
      expect(result.TOKEN).toBe("[REDACTED]");
    });

    it("redacts Password (mixed case)", () => {
      const result = maskSensitive({ Password: "hunter2" });
      expect(result.Password).toBe("[REDACTED]");
    });
  });

  describe("nested objects", () => {
    it("redacts sensitive keys inside nested objects", () => {
      const input  = { user: { token: "ghp_secret", name: "Alice" } };
      const result = maskSensitive(input);
      expect(result.user.token).toBe("[REDACTED]");
      expect(result.user.name).toBe("Alice");
    });

    it("redacts deeply nested keys", () => {
      const input  = { a: { b: { c: { password: "deep" } } } };
      const result = maskSensitive(input);
      expect(result.a.b.c.password).toBe("[REDACTED]");
    });
  });

  describe("arrays", () => {
    it("processes arrays and redacts sensitive keys inside objects within arrays", () => {
      const input  = [{ token: "abc" }, { username: "alice" }];
      const result = maskSensitive(input);
      expect(result[0].token).toBe("[REDACTED]");
      expect(result[1].username).toBe("alice");
    });
  });

  describe("safe values pass through", () => {
    it("does not redact non-sensitive string values", () => {
      const input  = { username: "alice", requestId: "req-abc123", path: "/api/pipeline" };
      const result = maskSensitive(input);
      expect(result).toEqual(input);
    });

    it("preserves numeric values", () => {
      const input  = { statusCode: 200, retries: 3 };
      const result = maskSensitive(input);
      expect(result).toEqual(input);
    });

    it("preserves boolean values", () => {
      const input  = { success: true, cached: false };
      const result = maskSensitive(input);
      expect(result).toEqual(input);
    });
  });

  describe("edge cases", () => {
    it("handles null input", () => {
      expect(maskSensitive(null)).toBeNull();
    });

    it("handles undefined input", () => {
      expect(maskSensitive(undefined)).toBeUndefined();
    });

    it("handles primitive string input", () => {
      expect(maskSensitive("hello")).toBe("hello");
    });

    it("handles empty object", () => {
      expect(maskSensitive({})).toEqual({});
    });

    it("does not mutate the original object", () => {
      const original = { token: "secret", name: "Alice" };
      const copy     = { ...original };
      maskSensitive(original);
      expect(original).toEqual(copy); // original unchanged
    });

    it("shows type hint for non-string sensitive values", () => {
      const result = maskSensitive({ token: 12345 });
      expect(result.token).toMatch(/REDACTED/);
    });
  });
});
