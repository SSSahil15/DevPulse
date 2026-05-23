/**
 * schemas.test.js
 * ===============
 * Unit tests for all reusable Zod schemas in src/validation/schemas.js.
 *
 * Pattern: call .safeParse() and assert .success / .error.issues shape.
 * Tests are grouped by schema so coverage is traceable.
 */

const {
  safeStringSchema,
  githubFullNameSchema,
  githubUrlSchema,
  paginationSchema,
  uuidSchema,
  jobIdSchema,
  commitShaSchema,
  emailSchema,
  isMalicious,
} = require("../validation/schemas");

// ─── Helper ───────────────────────────────────────────────────────────────────
const ok  = (schema, val) => expect(schema.safeParse(val).success).toBe(true);
const bad = (schema, val) => expect(schema.safeParse(val).success).toBe(false);

// ─── isMalicious ─────────────────────────────────────────────────────────────
describe("isMalicious()", () => {
  it("returns false for normal strings", () => {
    expect(isMalicious("octocat/hello-world")).toBe(false);
    expect(isMalicious("user@example.com")).toBe(false);
    expect(isMalicious("abc123")).toBe(false);
  });

  it("returns true for HTML tags", () => {
    expect(isMalicious("<script>alert(1)</script>")).toBe(true);
    expect(isMalicious("<img src=x>")).toBe(true);
  });

  it("returns true for javascript: URI", () => {
    expect(isMalicious("javascript:alert(1)")).toBe(true);
  });

  it("returns true for inline event handlers", () => {
    expect(isMalicious("onclick=alert(1)")).toBe(true);
  });

  it("returns true for SQL injection patterns", () => {
    expect(isMalicious("SELECT * FROM users")).toBe(true);
    expect(isMalicious("'; DROP TABLE users;--")).toBe(true);
    expect(isMalicious("1 UNION SELECT null,null--")).toBe(true);
  });

  it("returns true for path traversal", () => {
    expect(isMalicious("../../etc/passwd")).toBe(true);
  });

  it("returns true for null bytes", () => {
    expect(isMalicious("hello\x00world")).toBe(true);
  });
});

// ─── safeStringSchema ─────────────────────────────────────────────────────────
describe("safeStringSchema()", () => {
  const schema = safeStringSchema(100, "Test");

  it("accepts normal strings within limit", () => {
    ok(schema, "hello world");
    ok(schema, "a");
  });

  it("rejects empty string", () => bad(schema, ""));
  it("rejects whitespace-only (trimmed to empty)", () => bad(schema, "   "));
  it("rejects strings over maxLen", () => bad(schema, "a".repeat(101)));
  it("rejects injection patterns", () => bad(schema, "<script>xss</script>"));
  it("rejects SQL injection", () => bad(schema, "SELECT * FROM users"));
});

// ─── githubFullNameSchema ─────────────────────────────────────────────────────
describe("githubFullNameSchema", () => {
  it("accepts standard owner/repo", () => {
    ok(githubFullNameSchema, "octocat/hello-world");
    ok(githubFullNameSchema, "my-org/my.repo_name");
  });

  it("rejects bare repo name (no slash)", () => bad(githubFullNameSchema, "noslash"));
  it("rejects empty string", ()       => bad(githubFullNameSchema, ""));
  it("rejects string < 3 chars", ()   => bad(githubFullNameSchema, "a/"));
  it("rejects path traversal", ()     => bad(githubFullNameSchema, "../etc/passwd"));
  it("rejects special chars", ()      => bad(githubFullNameSchema, "owner/repo;rm -rf /"));
  it("rejects over 200 chars", ()     => bad(githubFullNameSchema, "a/".padEnd(201, "b")));
  it("trims whitespace before check", () => ok(githubFullNameSchema, "  octocat/hello-world  "));
});

// ─── githubUrlSchema ─────────────────────────────────────────────────────────
describe("githubUrlSchema", () => {
  it("accepts valid github.com URLs", () => {
    ok(githubUrlSchema, "https://github.com/octocat/hello-world");
    ok(githubUrlSchema, "https://www.github.com/owner/repo");
  });

  it("rejects non-github domains (SSRF protection)", () => {
    bad(githubUrlSchema, "https://evil.com/owner/repo");
    bad(githubUrlSchema, "https://github.evil.com/a/b");
  });

  it("rejects URLs with fewer than 2 path segments", () => {
    bad(githubUrlSchema, "https://github.com/onlyone");
  });

  it("rejects non-URL strings", () => bad(githubUrlSchema, "not a url"));
  it("rejects javascript: URLs",  () => bad(githubUrlSchema, "javascript:alert(1)"));
});

// ─── paginationSchema ─────────────────────────────────────────────────────────
describe("paginationSchema", () => {
  it("accepts valid page and limit", () => {
    ok(paginationSchema, { page: 1, limit: 20 });
    ok(paginationSchema, { page: 5, limit: 100 });
  });

  it("coerces string numbers to integers", () => {
    const result = paginationSchema.safeParse({ page: "2", limit: "50" });
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(2);
    expect(result.data.limit).toBe(50);
  });

  it("uses defaults when fields are absent", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(20);
  });

  it("rejects page < 1",    () => bad(paginationSchema, { page: 0, limit: 10 }));
  it("rejects limit > 100", () => bad(paginationSchema, { page: 1, limit: 101 }));
  it("rejects limit < 1",   () => bad(paginationSchema, { page: 1, limit: 0 }));
  it("rejects negative page", () => bad(paginationSchema, { page: -1, limit: 10 }));
});

// ─── uuidSchema ──────────────────────────────────────────────────────────────
describe("uuidSchema", () => {
  it("accepts a valid UUID v4", () => {
    ok(uuidSchema, "550e8400-e29b-41d4-a716-446655440000");
    ok(uuidSchema, "f47ac10b-58cc-4372-a567-0e02b2c3d479");
  });

  it("rejects non-UUID strings",    () => bad(uuidSchema, "not-a-uuid"));
  it("rejects UUID v1",             () => bad(uuidSchema, "550e8400-e29b-11d4-a716-446655440000"));
  it("rejects empty string",        () => bad(uuidSchema, ""));
});

// ─── jobIdSchema ─────────────────────────────────────────────────────────────
describe("jobIdSchema", () => {
  it("accepts valid job IDs",        () => ok(jobIdSchema, "job_" + "a".repeat(16)));
  it("accepts hex chars in suffix",  () => ok(jobIdSchema, "job_1234567890abcdef"));
  it("rejects without job_ prefix", () => bad(jobIdSchema, "1234567890abcdef"));
  it("rejects wrong suffix length",  () => bad(jobIdSchema, "job_short"));
  it("rejects uppercase in suffix",  () => bad(jobIdSchema, "job_ABCDEF1234567890"));
});

// ─── commitShaSchema ─────────────────────────────────────────────────────────
describe("commitShaSchema", () => {
  const valid40 = "a1b2c3d4e5f67890".repeat(2) + "a1b2c3d4";

  it("accepts a valid 40-char lowercase hex SHA", () => ok(commitShaSchema, valid40));
  it("accepts uppercase hex",                     () => ok(commitShaSchema, valid40.toUpperCase()));
  it("rejects 39-char SHA",   () => bad(commitShaSchema, "a".repeat(39)));
  it("rejects 41-char SHA",   () => bad(commitShaSchema, "a".repeat(41)));
  it("rejects non-hex chars", () => bad(commitShaSchema, "g".repeat(40)));
  it("rejects empty string",  () => bad(commitShaSchema, ""));
});

// ─── emailSchema ─────────────────────────────────────────────────────────────
describe("emailSchema", () => {
  it("accepts standard emails", () => {
    ok(emailSchema, "user@example.com");
    ok(emailSchema, "user+tag@sub.domain.co.uk");
  });

  it("trims whitespace", () => ok(emailSchema, "  user@example.com  "));
  it("rejects missing @", ()   => bad(emailSchema, "notanemail"));
  it("rejects missing domain", () => bad(emailSchema, "user@"));
  it("rejects over 254 chars", () => bad(emailSchema, "a".repeat(250) + "@b.com"));
  it("rejects empty string",   () => bad(emailSchema, ""));
});
