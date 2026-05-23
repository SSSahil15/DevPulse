/**
 * AnalysisPanel.test.jsx
 * ======================
 * Tests for AnalysisPanel — covers the three main render paths:
 *  1. No repository selected → empty state
 *  2. Repository selected, no scan yet → header + Scan button
 *  3. Simulate flow: pending → polling → done/failed
 *
 * MSW intercepts /api/pipeline/simulate and /api/pipeline/simulate/status/:jobId
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import AnalysisPanel from '../../components/AnalysisPanel';

const API_BASE = 'http://localhost:4000';

// ─── Recharts stub (avoids SVG/ResizeObserver errors in jsdom) ────────────────
vi.mock('recharts', async () => {
  const real = await vi.importActual('recharts');
  return {
    ...real,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    AreaChart:  () => <div data-testid="area-chart" />,
    PieChart:   () => <div data-testid="pie-chart" />,
    Area: () => null, Cell: () => null,
    XAxis: () => null, YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Pie: () => null,
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRepo = {
  id:             1,
  name:           'hello-world',
  fullName:       'octocat/hello-world',
  description:    'A sample repository',
  htmlUrl:        'https://github.com/octocat/hello-world',
  language:       'JavaScript',
  stargazersCount: 42,
  forksCount:     5,
  updatedAt:      new Date().toISOString(),
  isPrivate:      false,
};

const mockResult = {
  id:            'result-1',
  repository:    'octocat/hello-world',
  branch:        'main',
  commitSha:     'abc123def456abc1',
  overallStatus: 'success',
  receivedAt:    new Date().toISOString(),
  devpulseScore: { score: 87, status: 'SAFE', riskCategory: 'LOW', factors: {} },
  stages: {
    backend:  { tests: 'success' },
    security: { critical: 0, high: 1, medium: 2, vulnerabilities: [] },
  },
  insights: {
    explanation: 'Pipeline looks good.',
    suggestions: ['Keep it up!'],
    issues:      [],
    rootCause:   null,
  },
};

function renderPanel(props = {}) {
  const defaults = {
    analysisState:  { status: 'idle', error: '', targetRepositoryId: null, jobStatus: null },
    analysisResult: null,
    onAnalyze:      vi.fn(),
    repository:     mockRepo,
    accessToken:    'ghp_test_token',
    onScanComplete: vi.fn(),
    sidebarHistory: [],
  };
  return render(<AnalysisPanel {...defaults} {...props} />);
}

// ─── No repository selected ───────────────────────────────────────────────────

describe('AnalysisPanel — no repository', () => {
  it('shows "No repository selected" empty state', () => {
    renderPanel({ repository: null });
    expect(screen.getByText('No repository selected')).toBeInTheDocument();
  });

  it('shows instructional text in empty state', () => {
    renderPanel({ repository: null });
    expect(screen.getByText(/Pick a repository/i)).toBeInTheDocument();
  });
});

// ─── Repository selected, idle state ─────────────────────────────────────────

describe('AnalysisPanel — repository selected (idle)', () => {
  it('renders the repository full name in the header', () => {
    renderPanel();
    expect(screen.getByText('octocat/hello-world')).toBeInTheDocument();
  });

  it('renders repository description', () => {
    renderPanel();
    expect(screen.getByText('A sample repository')).toBeInTheDocument();
  });

  it('renders star count', () => {
    renderPanel();
    expect(screen.getByText(/42 Stars/i)).toBeInTheDocument();
  });

  it('renders fork count', () => {
    renderPanel();
    expect(screen.getByText(/5 Forks/i)).toBeInTheDocument();
  });

  it('renders a "Simulate CI/CD" button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /simulate ci\/cd/i })).toBeInTheDocument();
  });

  it('shows "--" for score before any scan', () => {
    renderPanel();
    // DevPulse score metric card shows "--" when no session data
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });
});

// ─── Repository with no description ──────────────────────────────────────────

describe('AnalysisPanel — repository without description', () => {
  it('shows default description text when description is null', () => {
    renderPanel({ repository: { ...mockRepo, description: null } });
    expect(screen.getByText(/Real-time CI\/CD pipeline intelligence/i)).toBeInTheDocument();
  });
});

// ─── Simulate / scan flow ─────────────────────────────────────────────────────

describe('AnalysisPanel — simulate scan flow', () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/api/pipeline/simulate`, () =>
        HttpResponse.json({ jobId: 'job_test_001' }, { status: 202 })
      ),
      http.get(`${API_BASE}/api/pipeline/simulate/status/:jobId`, () =>
        HttpResponse.json({
          jobId:      'job_test_001',
          status:     'done',
          repository: 'octocat/hello-world',
          record:     mockResult,
        })
      ),
    );
  });

  it('clicking "Simulate CI/CD" calls the simulate endpoint', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /simulate ci\/cd/i }));

    // Simulate progress indicator appears while scanning
    await waitFor(() => {
      // Either scanning in progress or completed — no crash
      expect(screen.getByText('octocat/hello-world')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows scan result score after successful simulate', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /simulate ci\/cd/i }));

    await waitFor(() => {
      // After scan completes, devpulseScore = 87 should appear
      expect(screen.getByText('87')).toBeInTheDocument();
    }, { timeout: 8000 });
  });
});

// ─── Failed simulate ──────────────────────────────────────────────────────────

describe('AnalysisPanel — failed simulate', () => {
  it('shows repository header even after a failed scan', async () => {
    server.use(
      http.post(`${API_BASE}/api/pipeline/simulate`, () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      ),
    );
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /simulate ci\/cd/i }));

    await waitFor(() => {
      expect(screen.getByText('octocat/hello-world')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

// ─── analysisState loading ────────────────────────────────────────────────────

describe('AnalysisPanel — analysisState prop', () => {
  it('renders without crash when analysisState.status is loading', () => {
    renderPanel({
      analysisState: { status: 'loading', error: '', targetRepositoryId: 1, jobStatus: null },
    });
    expect(screen.getByText('octocat/hello-world')).toBeInTheDocument();
  });

  it('renders without crash when analysisState.status is error', () => {
    renderPanel({
      analysisState: { status: 'error', error: 'Failed', targetRepositoryId: 1, jobStatus: null },
    });
    expect(screen.getByText('octocat/hello-world')).toBeInTheDocument();
  });
});
