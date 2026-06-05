const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/env');
const redis = require('./redis.service');
const logger = require('../utils/logger');

// ─── Lightweight Circuit Breaker ──────────────────────────────────────────────
const circuitBreaker = {
  failures: 0,
  openUntil: null,
  THRESHOLD: 3, // open after N consecutive failures
  RESET_MS: 30_000, // stay open for 30s, then half-open

  isOpen() {
    if (this.openUntil && Date.now() < this.openUntil) return true;
    if (this.openUntil && Date.now() >= this.openUntil) {
      // half-open: allow one probe
      this.openUntil = null;
    }
    return false;
  },

  recordSuccess() {
    this.failures = 0;
    this.openUntil = null;
  },

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.THRESHOLD) {
      this.openUntil = Date.now() + this.RESET_MS;
      logger.warn(
        '[GitHub] Circuit breaker OPEN — GitHub API unavailable, short-circuiting for 30s',
        {
          failures: this.failures,
          resetAt: new Date(this.openUntil).toISOString(),
        },
      );
    }
  },
};

function createGitHubClient(accessToken) {
  const client = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'DevPulse',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    timeout: 10000,
  });

  // ─── Request timing interceptors ─────────────────────────────────────────
  client.interceptors.request.use((cfg) => {
    // Attach start time so the response interceptor can compute duration
    cfg.metadata = { startMs: Date.now() };

    // Circuit breaker gate
    if (circuitBreaker.isOpen()) {
      const err = new Error('GitHub API circuit breaker is open — too many consecutive failures');
      err.code = 'CIRCUIT_OPEN';
      return Promise.reject(err);
    }

    return cfg;
  });

  client.interceptors.response.use(
    (response) => {
      const durationMs = Date.now() - (response.config.metadata?.startMs || Date.now());
      circuitBreaker.recordSuccess();
      logger.info('[GitHub] API call', {
        endpoint: response.config.url,
        method: response.config.method?.toUpperCase(),
        status: response.status,
        duration_ms: durationMs,
        rate_limit_remaining: response.headers['x-ratelimit-remaining'] ?? null,
      });
      return response;
    },
    (error) => {
      const durationMs = Date.now() - (error.config?.metadata?.startMs || Date.now());
      if (error.code !== 'CIRCUIT_OPEN') {
        circuitBreaker.recordFailure();
      }
      logger.warn('[GitHub] API error', {
        endpoint: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status ?? null,
        duration_ms: durationMs,
        code: error.code,
        message: error.message,
      });
      return Promise.reject(error);
    },
  );

  return client;
}

function mapRepository(repository) {
  return {
    archived: repository.archived,
    defaultBranch: repository.default_branch,
    description: repository.description,
    forksCount: repository.forks_count,
    fullName: repository.full_name,
    htmlUrl: repository.html_url,
    id: repository.id,
    language: repository.language,
    name: repository.name,
    openIssuesCount: repository.open_issues_count,
    private: repository.private,
    pushedAt: repository.pushed_at,
    size: repository.size,
    stargazersCount: repository.stargazers_count,
    updatedAt: repository.updated_at,
    visibility: repository.visibility,
  };
}

function getNextPageUrl(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
  return nextLinkMatch?.[1] || null;
}

async function fetchPaginatedGitHubResults(client, endpoint, initialParams) {
  const items = [];
  let nextUrl = endpoint;
  let nextParams = initialParams;

  for (let page = 1; page <= config.githubRepoPageLimit && nextUrl; page += 1) {
    const response = await client.get(nextUrl, {
      params: nextParams,
    });

    items.push(...response.data);
    nextUrl = getNextPageUrl(response.headers.link);
    nextParams = undefined;
  }

  return items;
}

async function fetchAuthenticatedViewer(accessToken) {
  const client = createGitHubClient(accessToken);
  const response = await client.get('/user');

  return {
    avatarUrl: response.data.avatar_url,
    id: response.data.id,
    login: response.data.login,
    profileUrl: response.data.html_url,
  };
}

async function fetchUserRepositories(accessToken) {
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  const cacheKey = `user:repos:${tokenHash}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`[GitHub] Cache HIT for user repos (${tokenHash.substring(0, 8)})`);
    return cached;
  }

  const client = createGitHubClient(accessToken);
  const repositories = await fetchPaginatedGitHubResults(client, '/user/repos', {
    affiliation: 'owner,collaborator,organization_member',
    direction: 'desc',
    per_page: 100,
    sort: 'updated',
  });

  const mapped = repositories.map(mapRepository);
  await redis.set(cacheKey, mapped, 3600); // 1 hour cache
  return mapped;
}

async function fetchRepository(accessToken, repositoryFullName) {
  const cacheKey = `repo:${repositoryFullName}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`[GitHub] Cache HIT for repo: ${repositoryFullName}`);
    return cached;
  }

  const client = createGitHubClient(accessToken);
  const response = await client.get(`/repos/${repositoryFullName}`);
  await redis.set(cacheKey, response.data, 3600); // 1 hour cache
  return response.data;
}

/**
 * Fetch commit activity for the last 30 days.
 * Returns commit frequency (commits per week) and code churn (total additions + deletions).
 */
async function fetchCommitActivity(accessToken, repoFullName) {
  const client = createGitHubClient(accessToken);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch up to 100 recent commits with stats
    const response = await client.get(`/repos/${repoFullName}/commits`, {
      params: { since, per_page: 100 },
    });

    const commits = response.data || [];
    const totalCommits = commits.length;
    const commitsPerWeek = Math.round((totalCommits / 30) * 7 * 10) / 10;

    // Fetch stats for up to 20 most recent commits to estimate churn
    let totalAdditions = 0;
    let totalDeletions = 0;
    const statsPromises = commits.slice(0, 20).map(async (commit) => {
      try {
        const detail = await client.get(`/repos/${repoFullName}/commits/${commit.sha}`);
        return detail.data.stats || { additions: 0, deletions: 0 };
      } catch {
        return { additions: 0, deletions: 0 };
      }
    });

    const statsResults = await Promise.allSettled(statsPromises);
    statsResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        totalAdditions += result.value.additions || 0;
        totalDeletions += result.value.deletions || 0;
      }
    });

    return {
      totalCommits,
      commitsPerWeek,
      totalAdditions,
      totalDeletions,
      codeChurn: totalAdditions + totalDeletions,
      periodDays: 30,
    };
  } catch (error) {
    console.error(`[GitHub] Failed to fetch commit activity for ${repoFullName}:`, error.message);
    return {
      totalCommits: 0,
      commitsPerWeek: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      codeChurn: 0,
      periodDays: 30,
    };
  }
}

/**
 * Fetch the contributor count for a repository.
 */
async function fetchContributors(accessToken, repoFullName) {
  const client = createGitHubClient(accessToken);

  try {
    const response = await client.get(`/repos/${repoFullName}/contributors`, {
      params: { per_page: 100, anon: false },
    });
    return {
      count: (response.data || []).length,
      contributors: (response.data || []).slice(0, 10).map((c) => ({
        login: c.login,
        contributions: c.contributions,
        avatarUrl: c.avatar_url,
      })),
    };
  } catch (error) {
    console.error(`[GitHub] Failed to fetch contributors for ${repoFullName}:`, error.message);
    return { count: 1, contributors: [] };
  }
}

/**
 * Orchestrator: Fetch all repo health metrics in parallel.
 */
async function fetchRepoHealth(accessToken, repoFullName) {
  const cacheKey = `repo:health:${repoFullName}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`[GitHub] Cache HIT for repo health: ${repoFullName}`);
    return cached;
  }

  const [commitActivity, contributorData] = await Promise.all([
    fetchCommitActivity(accessToken, repoFullName),
    fetchContributors(accessToken, repoFullName),
  ]);

  const health = {
    commitActivity,
    contributors: contributorData,
  };
  await redis.set(cacheKey, health, 3600); // 1 hour cache
  return health;
}

module.exports = {
  fetchRepoHealth,
  fetchRepository,
  fetchUserRepositories,
  mapRepository,
};
