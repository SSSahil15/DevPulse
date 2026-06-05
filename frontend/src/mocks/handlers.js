/**
 * MSW Request Handlers
 * ====================
 * Mock Service Worker handlers for all DevPulse API endpoints.
 * Imported by setupTests.js to intercept all fetch() calls during Vitest runs.
 *
 * Override specific handlers per test with:
 *   server.use(http.get('/api/pipeline/results', () => HttpResponse.json({ results: [] })));
 */
import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:4000';

// ─── Shared fixture data ──────────────────────────────────────────────────────

  id: '123',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: 'https://avatars.githubusercontent.com/u/123',
  githubTokenSynced: true,
};

  score: 85,
  status: 'SAFE',
  riskCategory: 'LOW',
  factors: {},
};

  id: 'result-1',
  repository: 'octocat/hello-world',
  branch: 'main',
  commitSha: 'abc123',
  overallStatus: 'success',
  devpulseScore: mockScore,
  receivedAt: new Date().toISOString(),
  stages: { backend: { tests: 'success' }, security: { critical: 0, high: 0, medium: 0 } },
  insights: { explanation: 'All good', suggestions: [], issues: [], rootCause: null },
};

  token: 'dp_rpt_aabbccddeeff001122334455',
  repository: 'octocat/hello-world',
  devpulseScore: mockScore,
  stages: mockResult.stages,
  insights: mockResult.insights,
  createdBy: 'testuser',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  expired: false,
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // Auth
  http.get(`${API_BASE}/auth/me`, () =>
    HttpResponse.json({ authenticated: true, user: mockUser, githubTokenSynced: true }),
  ),

  // Repos (legacy endpoint kept for backwards compat)
  http.get(`${API_BASE}/repos`, () =>
    HttpResponse.json([
      { id: '1', full_name: 'owner/repo1', description: 'Test Repo 1' },
      { id: '2', full_name: 'owner/repo2', description: 'Test Repo 2' },
    ]),
  ),

  // Analyze (legacy)
  http.post(`${API_BASE}/analyze`, () =>
    HttpResponse.json({ success: true, data: { jobId: 'job_123', status: 'queued' } }),
  ),

  // Pipeline — results list
  http.get(`${API_BASE}/api/pipeline/results`, () =>
    HttpResponse.json({ results: [mockResult], total: 1 }),
  ),

  // Pipeline — single result by runId
  http.get(`${API_BASE}/api/pipeline/results/:runId`, ({ params }) =>
    HttpResponse.json({ ...mockResult, runId: params.runId }),
  ),

  // Pipeline — health
  http.get(`${API_BASE}/api/pipeline/health`, () =>
    HttpResponse.json({ totalRuns: 5, successRate: 80, avgScore: 85, latest: mockResult }),
  ),

  // Pipeline — score (must be before /history or order matters)
  http.get(`${API_BASE}/api/pipeline/score/:owner/:repo/history`, () =>
    HttpResponse.json({
      history: [{ score: 85, runId: '1', commitSha: 'abc', receivedAt: new Date().toISOString() }],
    }),
  ),

  http.get(`${API_BASE}/api/pipeline/score/:owner/:repo`, () =>
    HttpResponse.json({
      devpulseScore: mockScore,
      repository: 'octocat/hello-world',
      branch: 'main',
    }),
  ),

  // Simulate — kick off
  http.post(`${API_BASE}/api/pipeline/simulate`, () =>
    HttpResponse.json({ jobId: 'job_test123' }, { status: 202 }),
  ),

  // Simulate — status
  http.get(`${API_BASE}/api/pipeline/simulate/status/:jobId`, () =>
    HttpResponse.json({
      jobId: 'job_test123',
      status: 'done',
      repository: 'octocat/hello-world',
      record: mockResult,
    }),
  ),

  // Reports — create
  http.post(`${API_BASE}/api/reports`, () =>
    HttpResponse.json(
      {
        message: 'Report created.',
        token: mockReport.token,
        shareUrl: `/report/${mockReport.token}`,
        expiresAt: mockReport.expiresAt,
      },
      { status: 201 },
    ),
  ),

  // Reports — fetch by token
  http.get(`${API_BASE}/api/reports/:token`, () => HttpResponse.json(mockReport)),

  // AI Chat
  http.post(`${API_BASE}/api/ai/chat`, () =>
    HttpResponse.json({ answer: 'Here is my analysis.', sources: [] }),
  ),
];
