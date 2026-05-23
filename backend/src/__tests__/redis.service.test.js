/**
 * redis.service.test.js
 * =====================
 * Unit tests for redis.service.js.
 *
 * The service guards all operations with:
 *   if (!client || !isConnected) return <safe-default>;
 * When NODE_ENV=test the client is never created, so every method hits the
 * null-guard path and returns immediately without touching Redis.
 *
 * Tests verify the public contract: get/set/del/delPattern all return safe
 * values without throwing even when the client is not connected.
 * The `isConnected` export is a function (() => boolean) — not a bool.
 */

const redis = require("../services/redis.service");

describe("redis.service — null-client (NODE_ENV=test) safe defaults", () => {
  describe("get()", () => {
    it("returns null for any key when client is not connected", async () => {
      await expect(redis.get("some:key")).resolves.toBeNull();
    });

    it("returns null for undefined key — does not throw", async () => {
      await expect(redis.get(undefined)).resolves.toBeNull();
    });
  });

  describe("set()", () => {
    it("completes without throwing when client is not connected", async () => {
      // In test mode the client is null so set() early-returns without touching Redis.
      // We verify the contract: it resolves without throwing (not the exact return value,
      // which differs between the real service and jest mocks in other test files).
      await expect(redis.set("key", "value", 60)).resolves.not.toThrow();
    });

    it("does not throw with object values", async () => {
      await expect(
        redis.set("obj:key", JSON.stringify({ foo: "bar" }), 300)
      ).resolves.toBeDefined();   // resolves (doesn't reject)
    });
  });

  describe("del()", () => {
    it("does not throw when deleting a non-existent key", async () => {
      await expect(redis.del("ghost:key")).resolves.not.toThrow();
    });
  });

  describe("delPattern()", () => {
    it("does not throw when pattern matches nothing", async () => {
      await expect(redis.delPattern("ghost:*")).resolves.not.toThrow();
    });

    it("completes without throwing — safe default", async () => {
      await expect(redis.delPattern("test:*")).resolves.not.toThrow();
    });
  });

  describe("isConnected — exported as function", () => {
    it("is exported as a function", () => {
      expect(typeof redis.isConnected).toBe("function");
    });

    it("returns false in test mode (client never created)", () => {
      expect(redis.isConnected()).toBe(false);
    });
  });

  describe("client property", () => {
    it("client is null in test mode", () => {
      expect(redis.client).toBeNull();
    });
  });
});
