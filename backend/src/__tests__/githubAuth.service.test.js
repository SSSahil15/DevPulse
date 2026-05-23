/**
 * githubAuth.service.test.js
 * ==========================
 * Tests for issueDevPulseJWT, verifyDevPulseJWT, and related helpers.
 * Does NOT test HTTP calls (exchangeCodeForGitHubToken, fetchGitHubUser)
 * — those require an axios mock and are out of scope for unit tests.
 */

const jwt = require("jsonwebtoken");
const config = require("../config/env");

// Load real service (not mocked)
const {
  issueDevPulseJWT,
  verifyDevPulseJWT,
} = require("../services/githubAuth.service");

// ─── Fixture ──────────────────────────────────────────────────────────────────
const mockGitHubUser = {
  id:                  12345,
  login:               "octocat",
  name:                "The Octocat",
  avatar_url:          "https://avatars.githubusercontent.com/u/12345",
  html_url:            "https://github.com/octocat",
  email:               "octocat@github.com",
  followers:           100,
  following:           50,
  public_repos:        30,
  total_private_repos: 5,
};

// ─── issueDevPulseJWT ─────────────────────────────────────────────────────────
describe("issueDevPulseJWT()", () => {
  it("returns a string (JWT format)", () => {
    const token = issueDevPulseJWT(mockGitHubUser);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("payload contains expected identity fields", () => {
    const token = issueDevPulseJWT(mockGitHubUser);
    const decoded = jwt.decode(token);

    expect(decoded.sub).toBe("12345");
    expect(decoded.username).toBe("octocat");
    expect(decoded.displayName).toBe("The Octocat");
    expect(decoded.avatarUrl).toBe(mockGitHubUser.avatar_url);
    expect(decoded.profileUrl).toBe(mockGitHubUser.html_url);
    expect(decoded.email).toBe("octocat@github.com");
    expect(decoded.followers).toBe(100);
    expect(decoded.following).toBe(50);
    expect(decoded.publicRepos).toBe(30);
    expect(decoded.privateRepos).toBe(5);
  });

  it("sets issuer to 'devpulse'", () => {
    const token = issueDevPulseJWT(mockGitHubUser);
    const decoded = jwt.decode(token);
    expect(decoded.iss).toBe("devpulse");
  });

  it("expires in ~7 days (exp - iat ≈ 604800s)", () => {
    const token = issueDevPulseJWT(mockGitHubUser);
    const decoded = jwt.decode(token);
    const duration = decoded.exp - decoded.iat;
    // Allow ±5 seconds for processing time
    expect(duration).toBeGreaterThanOrEqual(604795);
    expect(duration).toBeLessThanOrEqual(604805);
  });

  it("falls back to login as displayName when name is null", () => {
    const user = { ...mockGitHubUser, name: null };
    const token = issueDevPulseJWT(user);
    const decoded = jwt.decode(token);
    expect(decoded.displayName).toBe("octocat");
  });

  it("sets email to null when user has no email", () => {
    const user = { ...mockGitHubUser, email: null };
    const token = issueDevPulseJWT(user);
    const decoded = jwt.decode(token);
    expect(decoded.email).toBeNull();
  });

  it("defaults numeric fields to 0 when missing", () => {
    const user = { id: 1, login: "min" }; // no optional fields
    const token = issueDevPulseJWT(user);
    const decoded = jwt.decode(token);
    expect(decoded.followers).toBe(0);
    expect(decoded.following).toBe(0);
    expect(decoded.publicRepos).toBe(0);
    expect(decoded.privateRepos).toBe(0);
  });

  it("does NOT include the GitHub access token in the payload", () => {
    const user = { ...mockGitHubUser, access_token: "ghp_secret" };
    const token = issueDevPulseJWT(user);
    const decoded = jwt.decode(token);
    expect(decoded).not.toHaveProperty("access_token");
    expect(JSON.stringify(decoded)).not.toContain("ghp_secret");
  });
});

// ─── verifyDevPulseJWT ────────────────────────────────────────────────────────
describe("verifyDevPulseJWT()", () => {
  it("returns the decoded payload for a valid token", () => {
    const token = issueDevPulseJWT(mockGitHubUser);
    const payload = verifyDevPulseJWT(token);
    expect(payload.sub).toBe("12345");
    expect(payload.username).toBe("octocat");
  });

  it("throws HttpError(401) for a completely invalid token", () => {
    expect(() => verifyDevPulseJWT("not.a.token")).toThrow();
  });

  it("throws HttpError(401) for a token signed with the wrong secret", () => {
    const fakeToken = jwt.sign({ sub: "1" }, "wrong-secret", { issuer: "devpulse" });
    expect(() => verifyDevPulseJWT(fakeToken)).toThrow();
  });

  it("throws HttpError(401) for an expired token", () => {
    const expired = jwt.sign(
      { sub: "1", username: "x" },
      config.jwtSecret,
      { expiresIn: -1, issuer: "devpulse" }
    );
    expect(() => verifyDevPulseJWT(expired)).toThrow();
  });

  it("throws HttpError(401) for a token with wrong issuer", () => {
    const wrongIssuer = jwt.sign(
      { sub: "1" },
      config.jwtSecret,
      { issuer: "not-devpulse" }
    );
    expect(() => verifyDevPulseJWT(wrongIssuer)).toThrow();
  });

  it("round-trip: issue then verify returns same identity", () => {
    const token = issueDevPulseJWT(mockGitHubUser);
    const payload = verifyDevPulseJWT(token);
    expect(payload.sub).toBe("12345");
    expect(payload.username).toBe("octocat");
    expect(payload.email).toBe("octocat@github.com");
  });
});
