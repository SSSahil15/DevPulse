const axios = require("axios");

const config = require("../config/env");

function createGitHubClient(accessToken) {
  return axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "DevPulse",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    timeout: 10000
  });
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
    visibility: repository.visibility
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
      params: nextParams
    });

    items.push(...response.data);
    nextUrl = getNextPageUrl(response.headers.link);
    nextParams = undefined;
  }

  return items;
}

async function fetchAuthenticatedViewer(accessToken) {
  const client = createGitHubClient(accessToken);
  const response = await client.get("/user");

  return {
    avatarUrl: response.data.avatar_url,
    id: response.data.id,
    login: response.data.login,
    profileUrl: response.data.html_url
  };
}

async function fetchUserRepositories(accessToken) {
  const client = createGitHubClient(accessToken);
  const repositories = await fetchPaginatedGitHubResults(client, "/user/repos", {
    affiliation: "owner,collaborator,organization_member",
    direction: "desc",
    per_page: 100,
    sort: "updated"
  });

  return repositories.map(mapRepository);
}

async function fetchRepository(accessToken, repositoryFullName) {
  const client = createGitHubClient(accessToken);
  const response = await client.get(`/repos/${repositoryFullName}`);
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
      params: { since, per_page: 100 }
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
    statsResults.forEach(result => {
      if (result.status === "fulfilled") {
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
      periodDays: 30
    };
  } catch (error) {
    console.error(`[GitHub] Failed to fetch commit activity for ${repoFullName}:`, error.message);
    return {
      totalCommits: 0,
      commitsPerWeek: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      codeChurn: 0,
      periodDays: 30
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
      params: { per_page: 100, anon: false }
    });
    return {
      count: (response.data || []).length,
      contributors: (response.data || []).slice(0, 10).map(c => ({
        login: c.login,
        contributions: c.contributions,
        avatarUrl: c.avatar_url
      }))
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
  const [commitActivity, contributorData] = await Promise.all([
    fetchCommitActivity(accessToken, repoFullName),
    fetchContributors(accessToken, repoFullName),
  ]);

  return {
    commitActivity,
    contributors: contributorData,
  };
}

module.exports = {
  fetchAuthenticatedViewer,
  fetchCommitActivity,
  fetchContributors,
  fetchRepoHealth,
  fetchRepository,
  fetchUserRepositories,
  getNextPageUrl,
  mapRepository
};
