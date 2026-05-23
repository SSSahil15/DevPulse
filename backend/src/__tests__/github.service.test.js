/**
 * github.service.test.js
 * ======================
 * Tests for pure helper functions in github.service.js (mapRepository,
 * getNextPageUrl) and the axios-backed functions with mocked HTTP.
 *
 * Strategy:
 *  - Pure functions: tested directly, no mocks needed.
 *  - HTTP functions: axios mocked; redis mocked to control cache hit/miss.
 *  - circuitBreaker state: reset between tests via module re-require is tricky,
 *    so we test observable behaviour (returned values) not internal state.
 */

jest.mock("axios");
jest.mock("../services/redis.service", () => ({
  get:        jest.fn().mockResolvedValue(null),
  set:        jest.fn().mockResolvedValue(true),
  del:        jest.fn().mockResolvedValue(true),
  delPattern: jest.fn().mockResolvedValue(true),
  isConnected: () => false,
}));

const axios = require("axios");
const redis = require("../services/redis.service");

const {
  mapRepository,
  getNextPageUrl,
  fetchUserRepositories,
  fetchRepository,
  fetchCommitActivity,
  fetchContributors,
  fetchRepoHealth,
} = require("../services/github.service");

// ─── mapRepository ────────────────────────────────────────────────────────────
describe("mapRepository()", () => {
  const raw = {
    archived:          false,
    default_branch:    "main",
    description:       "A test repo",
    forks_count:       10,
    full_name:         "owner/repo",
    html_url:          "https://github.com/owner/repo",
    id:                12345,
    language:          "JavaScript",
    name:              "repo",
    open_issues_count: 3,
    private:           false,
    pushed_at:         "2024-01-01T00:00:00Z",
    size:              1024,
    stargazers_count:  50,
    updated_at:        "2024-01-02T00:00:00Z",
    visibility:        "public",
  };

  it("maps snake_case GitHub fields to camelCase", () => {
    const result = mapRepository(raw);

    expect(result.defaultBranch).toBe("main");
    expect(result.forksCount).toBe(10);
    expect(result.fullName).toBe("owner/repo");
    expect(result.htmlUrl).toBe("https://github.com/owner/repo");
    expect(result.openIssuesCount).toBe(3);
    expect(result.stargazersCount).toBe(50);
    expect(result.pushedAt).toBe("2024-01-01T00:00:00Z");
    expect(result.updatedAt).toBe("2024-01-02T00:00:00Z");
  });

  it("passes through scalar fields unchanged", () => {
    const result = mapRepository(raw);
    expect(result.archived).toBe(false);
    expect(result.id).toBe(12345);
    expect(result.language).toBe("JavaScript");
    expect(result.name).toBe("repo");
    expect(result.private).toBe(false);
    expect(result.size).toBe(1024);
    expect(result.visibility).toBe("public");
  });

  it("handles null/undefined optional fields gracefully", () => {
    const minimal = { ...raw, language: null, description: null };
    const result = mapRepository(minimal);
    expect(result.language).toBeNull();
    expect(result.description).toBeNull();
  });
});

// ─── getNextPageUrl ───────────────────────────────────────────────────────────
describe("getNextPageUrl()", () => {
  it("returns null when linkHeader is null", () => {
    expect(getNextPageUrl(null)).toBeNull();
  });

  it("returns null when linkHeader is undefined", () => {
    expect(getNextPageUrl(undefined)).toBeNull();
  });

  it("returns null when linkHeader is empty string", () => {
    expect(getNextPageUrl("")).toBeNull();
  });

  it("returns null when there is no rel=next link", () => {
    const header = '<https://api.github.com/repos?page=1>; rel="prev"';
    expect(getNextPageUrl(header)).toBeNull();
  });

  it("extracts the next page URL from a valid Link header", () => {
    const header =
      '<https://api.github.com/user/repos?page=2>; rel="next", ' +
      '<https://api.github.com/user/repos?page=5>; rel="last"';
    expect(getNextPageUrl(header)).toBe("https://api.github.com/user/repos?page=2");
  });

  it("is case-insensitive for rel=Next", () => {
    const header = '<https://api.github.com/repos?page=3>; rel="Next"';
    expect(getNextPageUrl(header)).toBe("https://api.github.com/repos?page=3");
  });
});

// ─── fetchUserRepositories ────────────────────────────────────────────────────
describe("fetchUserRepositories()", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);        // cache miss by default
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  it("returns cached repos when redis has a hit", async () => {
    const cachedRepos = [{ fullName: "owner/cached-repo" }];
    redis.get.mockResolvedValue(cachedRepos);

    const result = await fetchUserRepositories("ghp_token");

    expect(result).toEqual(cachedRepos);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it("fetches from GitHub API on cache miss and caches result", async () => {
    const rawRepo = {
      full_name: "owner/repo", id: 1, name: "repo", default_branch: "main",
      description: null, archived: false, forks_count: 0, html_url: "https://gh.com",
      language: "JS", open_issues_count: 0, private: false, pushed_at: null,
      size: 100, stargazers_count: 0, updated_at: null, visibility: "public",
    };
    mockAxiosInstance.get.mockResolvedValue({
      data: [rawRepo],
      headers: { link: null },
    });

    const result = await fetchUserRepositories("ghp_token");

    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("owner/repo");
    expect(redis.set).toHaveBeenCalled();
  });
});

// ─── fetchRepository ──────────────────────────────────────────────────────────
describe("fetchRepository()", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  it("returns cached data on cache hit", async () => {
    const cached = { full_name: "owner/repo", id: 1 };
    redis.get.mockResolvedValue(cached);

    const result = await fetchRepository("ghp_token", "owner/repo");
    expect(result).toEqual(cached);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it("calls GET /repos/:fullName on cache miss", async () => {
    const repoData = { full_name: "owner/repo", id: 999 };
    mockAxiosInstance.get.mockResolvedValue({ data: repoData, headers: {} });

    const result = await fetchRepository("ghp_token", "owner/repo");

    expect(mockAxiosInstance.get).toHaveBeenCalledWith("/repos/owner/repo");
    expect(result).toEqual(repoData);
  });
});

// ─── fetchCommitActivity ──────────────────────────────────────────────────────
describe("fetchCommitActivity()", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  it("returns zero-state when GitHub API call fails", async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error("API error"));

    const result = await fetchCommitActivity("ghp_token", "owner/repo");

    expect(result.totalCommits).toBe(0);
    expect(result.commitsPerWeek).toBe(0);
    expect(result.codeChurn).toBe(0);
    expect(result.periodDays).toBe(30);
  });

  it("returns commit metrics when API succeeds (no commits)", async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: [], headers: {} });

    const result = await fetchCommitActivity("ghp_token", "owner/repo");

    expect(result.totalCommits).toBe(0);
    expect(result.commitsPerWeek).toBe(0);
    expect(result.periodDays).toBe(30);
  });

  it("calculates commitsPerWeek from commit list", async () => {
    // 14 commits in 30 days → 14/30 * 7 = 3.3 → rounds to 3.3
    const commits = Array.from({ length: 14 }, (_, i) => ({
      sha: `sha${i}`,
    }));
    // First call = commit list, subsequent calls = individual commit stats
    mockAxiosInstance.get
      .mockResolvedValueOnce({ data: commits, headers: {} })
      .mockResolvedValue({ data: { stats: { additions: 10, deletions: 5 } }, headers: {} });

    const result = await fetchCommitActivity("ghp_token", "owner/repo");

    expect(result.totalCommits).toBe(14);
    expect(result.commitsPerWeek).toBe(3.3);
  });
});

// ─── fetchContributors ────────────────────────────────────────────────────────
describe("fetchContributors()", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  it("returns safe defaults on API failure", async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error("rate limited"));

    const result = await fetchContributors("ghp_token", "owner/repo");

    expect(result.count).toBe(1);
    expect(result.contributors).toHaveLength(0);
  });

  it("returns contributor list mapped to correct shape", async () => {
    const contributors = [
      { login: "alice", contributions: 100, avatar_url: "https://img/alice" },
      { login: "bob",   contributions: 50,  avatar_url: "https://img/bob" },
    ];
    mockAxiosInstance.get.mockResolvedValue({ data: contributors, headers: {} });

    const result = await fetchContributors("ghp_token", "owner/repo");

    expect(result.count).toBe(2);
    expect(result.contributors[0]).toEqual({
      login: "alice", contributions: 100, avatarUrl: "https://img/alice",
    });
  });

  it("caps contributors list at 10 entries", async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      login: `user${i}`, contributions: 10, avatar_url: "https://img/u",
    }));
    mockAxiosInstance.get.mockResolvedValue({ data: many, headers: {} });

    const result = await fetchContributors("ghp_token", "owner/repo");

    expect(result.count).toBe(25);                     // total count is real
    expect(result.contributors).toHaveLength(10);      // but list is capped
  });
});

// ─── fetchRepoHealth ──────────────────────────────────────────────────────────
describe("fetchRepoHealth()", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    axios.create.mockReturnValue(mockAxiosInstance);
    mockAxiosInstance.get.mockResolvedValue({ data: [], headers: {} });
  });

  it("returns cached health data on cache hit", async () => {
    const cached = { commitActivity: { totalCommits: 10 }, contributors: { count: 3 } };
    redis.get.mockResolvedValue(cached);

    const result = await fetchRepoHealth("ghp_token", "owner/repo");

    expect(result).toEqual(cached);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it("returns object with commitActivity and contributors on cache miss", async () => {
    const result = await fetchRepoHealth("ghp_token", "owner/repo");

    expect(result).toHaveProperty("commitActivity");
    expect(result).toHaveProperty("contributors");
    expect(redis.set).toHaveBeenCalled();
  });
});
