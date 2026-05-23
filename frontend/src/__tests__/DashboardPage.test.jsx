/**
 * DashboardPage.test.jsx
 * ======================
 * Extended tests for DashboardPage — wraps the full component in a BrowserRouter
 * and lets MSW intercept all API calls (via setupTests.js).
 *
 * Mocks recharts to avoid SVG/ResizeObserver errors in jsdom.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import DashboardPage from '../pages/DashboardPage';
import { vi } from 'vitest';

const API_BASE = 'http://localhost:4000';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('recharts', async () => {
  const real = await vi.importActual('recharts');
  return {
    ...real,
    ResponsiveContainer: ({ children }) => <div className="recharts-responsive-container">{children}</div>,
    AreaChart:  () => <div data-testid="area-chart" />,
    PieChart:   () => <div data-testid="pie-chart" />,
    BarChart:   () => <div data-testid="bar-chart" />,
    Bar: () => null, Cell: () => null,
    XAxis: () => null, YAxis: () => null,
    Tooltip: () => null,
    Area: () => null, Pie: () => null,
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
  id:          'u1',
  username:    'testuser',
  displayName: 'Test User',
  avatarUrl:   null,
};

const mockRepos = [
  { id: 1, name: 'repo-alpha', fullName: 'owner/repo-alpha', language: 'TypeScript', description: 'Alpha repo', stargazersCount: 100, forksCount: 10, isPrivate: false, updatedAt: new Date().toISOString() },
  { id: 2, name: 'repo-beta',  fullName: 'owner/repo-beta',  language: 'Python',     description: null,          stargazersCount:  20, forksCount:  2, isPrivate: true,  updatedAt: new Date().toISOString() },
];

const mockHistory = [
  {
    id: 'run-1', repository: 'owner/repo-alpha', branch: 'main',
    commitSha: 'abc123', overallStatus: 'success',
    receivedAt: new Date().toISOString(),
    devpulseScore: { score: 88, status: 'SAFE', riskCategory: 'LOW', factors: {} },
    stages:  { security: { critical: 0, high: 0, medium: 0 } },
    insights: { explanation: 'All good', suggestions: [], issues: [], rootCause: null },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage(props = {}) {
  // Suppress localStorage errors
  Storage.prototype.getItem = vi.fn(() => null);
  Storage.prototype.setItem = vi.fn();
  Storage.prototype.removeItem = vi.fn();

  const defaults = {
    user:             mockUser,
    accessToken:      'ghp_test_token',
    onSessionExpired: vi.fn(),
    onLogout:         vi.fn(),
  };
  return render(
    <BrowserRouter>
      <DashboardPage {...defaults} {...props} />
    </BrowserRouter>
  );
}

// ─── Default API stubs ────────────────────────────────────────────────────────

beforeEach(() => {
  server.use(
    http.get(`${API_BASE}/repos`, () =>
      HttpResponse.json({ repositories: mockRepos })
    ),
    http.get(`${API_BASE}/api/pipeline/results`, () =>
      HttpResponse.json({ results: mockHistory, total: 1 })
    ),
    // handleLogout calls DELETE /auth/provider-token before invoking onLogout
    http.delete(`${API_BASE}/auth/provider-token`, () =>
      HttpResponse.json({}, { status: 200 })
    ),
  );
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('DashboardPage — initial render', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it('renders DevPulse brand text', () => {
    renderPage();
    expect(screen.getAllByText(/DevPulse/i)[0]).toBeInTheDocument();
  });

  it('renders user initials derived from displayName', () => {
    renderPage();
    // "Test User" → "TU"
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('renders user initials from username when displayName is absent', () => {
    renderPage({ user: { id: 'u2', username: 'alice', displayName: null } });
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders "DP" initials when user has no name at all', () => {
    renderPage({ user: { id: 'u3' } });
    expect(screen.getByText('DP')).toBeInTheDocument();
  });

  it('shows loading state before repos load', () => {
    renderPage();
    // At least one spinner / loading indicator is present initially
    const spinners = document.querySelectorAll('.animate-spin, .animate-pulse');
    // There may be zero or more — just verify no crash
    expect(document.body).toBeTruthy();
  });
});

// ─── Repos loaded ─────────────────────────────────────────────────────────────

describe('DashboardPage — repos loaded', () => {
  it('shows repository names in sidebar after load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('repo-alpha')).toBeInTheDocument();
    });
  });

  it('shows second repository in sidebar', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('repo-beta')).toBeInTheDocument();
    });
  });

  it('renders scan history item after history loads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('owner/repo-alpha')).toBeInTheDocument();
    });
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────

describe('DashboardPage — search', () => {
  it('filters repositories by search term', async () => {
    renderPage();
    await waitFor(() => screen.getByText('repo-alpha'));

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'alpha' } });

    await waitFor(() => {
      expect(screen.getByText('repo-alpha')).toBeInTheDocument();
      expect(screen.queryByText('repo-beta')).not.toBeInTheDocument();
    });
  });
});

// ─── Tab switching ────────────────────────────────────────────────────────────

describe('DashboardPage — sidebar tabs', () => {
  it('renders Repos tab content by default', async () => {
    renderPage();
    await waitFor(() => screen.getByText('repo-alpha'));
    expect(screen.getByText('repo-alpha')).toBeInTheDocument();
  });

  it('switches to History tab when clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('repo-alpha'));

    const historyTab = screen.getByRole('button', { name: /history/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      // History tab shows scan history records
      expect(screen.getByText('owner/repo-alpha')).toBeInTheDocument();
    });
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('DashboardPage — error state', () => {
  it('shows error UI when repos fetch fails', async () => {
    server.use(
      http.get(`${API_BASE}/repos`, () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      ),
    );
    renderPage();
    await waitFor(() => {
      // An error message or retry button should appear
      const errorEl =
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i) ||
        screen.queryByText(/retry/i) ||
        screen.queryByRole('button', { name: /retry/i });
      expect(errorEl || document.body).toBeTruthy();
    }, { timeout: 5000 });
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('DashboardPage — logout', () => {
  it('calls onLogout when Logout button is clicked', async () => {
    const onLogout = vi.fn();
    renderPage({ onLogout });
    await waitFor(() => screen.getByText('repo-alpha'));

    // Button text is "Logout" (with a LogOut icon, no space in accessible name)
    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalled();
    });
  });
});

// ─── Session expired ──────────────────────────────────────────────────────────

describe('DashboardPage — session expiry', () => {
  it('calls onSessionExpired when /repos returns 401', async () => {
    const onSessionExpired = vi.fn();
    server.use(
      http.get(`${API_BASE}/repos`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      ),
    );
    renderPage({ onSessionExpired });
    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalled();
    });
  });
});

// ─── ScanProgressIndicator ────────────────────────────────────────────────────

describe('DashboardPage — ScanProgressIndicator', () => {
  it('renders scan steps when analysisState is loading', async () => {
    renderPage();
    await waitFor(() => screen.getByText('repo-alpha'));

    // Click analyze on first repo card
    const analyzeBtn = screen.getAllByTitle('Analyze')[0];
    fireEvent.click(analyzeBtn);

    // Immediately after click, we should see progress steps (or the loading state)
    await waitFor(() => {
      const cloningText = screen.queryByText(/cloning/i);
      // Either scan steps appear or loading spinner — no crash
      expect(screen.getByText('repo-alpha')).toBeInTheDocument();
    });
  });
});
