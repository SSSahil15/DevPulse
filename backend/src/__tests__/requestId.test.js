/**
 * requestId.test.js
 * =================
 * Tests for the requestId middleware.
 * Verifies that every response gets an X-Request-ID header and that
 * req.requestId is set before route handlers run.
 */

const request = require("supertest");
const express = require("express");
const requestId = require("../middleware/requestId");

function buildApp(routeFn) {
  const app = express();
  app.use(requestId);
  app.get("/test", routeFn);
  return app;
}

describe("requestId middleware", () => {
  it("sets X-Request-ID response header on every request", async () => {
    const app = buildApp((req, res) => res.json({ ok: true }));
    const res = await request(app).get("/test");
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(typeof res.headers["x-request-id"]).toBe("string");
  });

  it("generated ID matches the req-<8hex> format", async () => {
    const app = buildApp((req, res) => res.json({ id: req.requestId }));
    const res = await request(app).get("/test");
    expect(res.body.id).toMatch(/^req-[a-f0-9]{8}$/);
  });

  it("attaches requestId to req object so handlers can read it", async () => {
    const app = buildApp((req, res) => res.json({ id: req.requestId }));
    const res = await request(app).get("/test");
    expect(res.body.id).toBeTruthy();
    // Header and body value must match
    expect(res.body.id).toBe(res.headers["x-request-id"]);
  });

  it("generates a different ID for each request", async () => {
    const ids = new Set();
    const app = buildApp((req, res) => res.json({ id: req.requestId }));

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/test");
      ids.add(res.body.id);
    }

    // All 5 requests should have unique IDs
    expect(ids.size).toBe(5);
  });

  it("accepts a forwarded x-request-id header from upstream proxy", async () => {
    const app = buildApp((req, res) => res.json({ id: req.requestId }));
    const forwardedId = "upstream-id-1234";
    const res = await request(app)
      .get("/test")
      .set("x-request-id", forwardedId);

    expect(res.body.id).toBe(forwardedId);
    expect(res.headers["x-request-id"]).toBe(forwardedId);
  });

  it("rejects a forwarded ID that is too short (< 4 chars) and generates a fresh one", async () => {
    const app = buildApp((req, res) => res.json({ id: req.requestId }));
    const res = await request(app)
      .get("/test")
      .set("x-request-id", "ab"); // too short
    expect(res.body.id).toMatch(/^req-[a-f0-9]{8}$/);
  });

  it("rejects a forwarded ID that is too long (> 64 chars) and generates a fresh one", async () => {
    const app = buildApp((req, res) => res.json({ id: req.requestId }));
    const tooLong = "x".repeat(65);
    const res = await request(app)
      .get("/test")
      .set("x-request-id", tooLong);
    expect(res.body.id).toMatch(/^req-[a-f0-9]{8}$/);
  });
});
