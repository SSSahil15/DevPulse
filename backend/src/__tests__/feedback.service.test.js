/**
 * feedback.service.test.js
 * ========================
 * Tests for processFeedback and getFeedbackHistory.
 *
 * Mocks: axios (Discord webhook), nodemailer (email), fs (file I/O).
 * The fs mock prevents any real file reads/writes during tests.
 */

// ─── Mock fs BEFORE the module loads (it reads the file at require time) ──────
jest.mock("fs", () => ({
  existsSync:    jest.fn().mockReturnValue(false), // no feedback file exists
  mkdirSync:     jest.fn(),
  readFileSync:  jest.fn().mockReturnValue("[]"),
  writeFileSync: jest.fn(),
}));

jest.mock("axios");
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
  }),
}));

const axios     = require("axios");
const nodemailer = require("nodemailer");
const { processFeedback, getFeedbackHistory } = require("../services/feedback.service");

// ─── processFeedback ──────────────────────────────────────────────────────────
describe("processFeedback()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Discord and email succeed
    axios.post.mockResolvedValue({ status: 204 });
  });

  it("returns a feedback entry with id, text, email, createdAt", async () => {
    const result = await processFeedback("Great tool!", "user@example.com");

    expect(result).toHaveProperty("id");
    expect(result.text).toBe("Great tool!");
    expect(result.email).toBe("user@example.com");
    expect(result).toHaveProperty("createdAt");
  });

  it("defaults email to 'anonymous' when not provided", async () => {
    const result = await processFeedback("Anonymous feedback");
    expect(result.email).toBe("anonymous");
  });

  it("id is a string (timestamp-based)", async () => {
    const result = await processFeedback("test");
    expect(typeof result.id).toBe("string");
    // Should be a numeric string (Date.now())
    expect(Number(result.id)).toBeGreaterThan(0);
  });

  it("calls fs.writeFileSync to persist feedback", async () => {
    const { writeFileSync } = require("fs");
    writeFileSync.mockClear();
    await processFeedback("Persist me");
    expect(writeFileSync).toHaveBeenCalled();
  });

  it("does not throw when Discord webhook is not configured", async () => {
    // No discordWebhookUrl in test config — axios.post should not be called
    await expect(processFeedback("test", "user@x.com")).resolves.toBeDefined();
  });

  it("does not throw when Discord webhook call fails", async () => {
    axios.post.mockRejectedValueOnce(new Error("Discord unreachable"));
    // Should still resolve — errors are caught internally
    await expect(processFeedback("test", "user@x.com")).resolves.toBeDefined();
  });

  it("createdAt is a valid ISO date string", async () => {
    const result = await processFeedback("ISO date check");
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
  });

  it("each call produces a unique id", async () => {
    const r1 = await processFeedback("first");
    await new Promise((r) => setTimeout(r, 2)); // ensure distinct timestamps
    const r2 = await processFeedback("second");
    expect(r1.id).not.toBe(r2.id);
  });
});

// ─── getFeedbackHistory ───────────────────────────────────────────────────────
describe("getFeedbackHistory()", () => {
  it("returns an array", () => {
    const result = getFeedbackHistory();
    expect(Array.isArray(result)).toBe(true);
  });

  it("contains entries added via processFeedback", async () => {
    const before = getFeedbackHistory().length;
    await processFeedback("Track this", "track@test.com");
    const after  = getFeedbackHistory().length;
    expect(after).toBe(before + 1);
  });

  it("the last entry matches the most recently submitted feedback", async () => {
    await processFeedback("Last entry check", "last@test.com");
    const history = getFeedbackHistory();
    const last = history[history.length - 1];
    expect(last.text).toBe("Last entry check");
    expect(last.email).toBe("last@test.com");
  });
});
