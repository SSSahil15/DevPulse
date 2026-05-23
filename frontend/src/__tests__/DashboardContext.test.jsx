/**
 * DashboardContext.test.jsx
 * =========================
 * Tests for DashboardProvider and DashboardContext.
 *
 * Strategy:
 *  - Mock `../api` directly (vi.mock) to avoid retry delays on 5xx errors.
 *  - Each test controls what apiRequest resolves/rejects to.
 *  - ContextConsumer reads context values via useContext for assertions.
 */
import React, { useContext } from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardProvider, DashboardContext } from '../context/DashboardContext';

// ─── Mock the api module ──────────────────────────────────────────────────────
//
// vi.mock factories are hoisted to the top of the file (before declarations),
// so MockApiError and mockApiRequest must be defined with vi.hoisted().

const { MockApiError, mockApiRequest } = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(message, status) {
      super(message);
      this.name   = 'ApiError';
      this.status = status;
    }
  }
  const mockApiRequest = vi.fn();
  return { MockApiError, mockApiRequest };
});

vi.mock('../api', () => ({
  apiRequest: (...args) => mockApiRequest(...args),
  ApiError: MockApiError,
}));


// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRepos = [
  { id: 1, name: 'repo-one', fullName: 'owner/repo-one', language: 'JS',  description: 'First',  stargazersCount: 10, isPrivate: false },
  { id: 2, name: 'repo-two', fullName: 'owner/repo-two', language: 'TS',  description: 'Second', stargazersCount:  5, isPrivate: true  },
];

const mockHistoryRecord = {
  id:            'result-1',
  repository:    'owner/repo-one',
  overallStatus: 'success',
  receivedAt:    new Date().toISOString(),
  devpulseScore: { score: 90, status: 'SAFE', riskCategory: 'LOW', factors: {} },
};

// ─── Consumer component ───────────────────────────────────────────────────────

function ContextConsumer() {
  const ctx = useContext(DashboardContext);
  if (!ctx) return <div data-testid="no-ctx">no context</div>;
  return (
    <div>
      <span data-testid="repo-count">{ctx.repositories.length}</span>
      <span data-testid="repo-status">{ctx.repoState.status}</span>
      <span data-testid="repo-error">{ctx.repoState.error}</span>
      <span data-testid="analysis-status">{ctx.analysisState.status}</span>
      <span data-testid="filtered-count">{ctx.filteredRepositories.length}</span>
      <span data-testid="sidebar-count">{ctx.sidebarHistory.length}</span>
      <span data-testid="selected-ids-count">{ctx.selectedIds.size}</span>
      <button data-testid="analyze-btn"  onClick={() => ctx.handleAnalyze(mockRepos[0])}>Analyze</button>
      <button data-testid="delete-btn"   onClick={() => ctx.deleteRecord('result-1')}>Delete</button>
      <button data-testid="toggle-btn"   onClick={() => ctx.toggleSelect('result-1')}>Toggle</button>
      <button data-testid="bulk-del-btn" onClick={() => ctx.deleteSelected()}>BulkDelete</button>
      <button data-testid="history-btn"  onClick={() => ctx.fetchSidebarHistory()}>Refresh</button>
      <input  data-testid="search-input" onChange={e => ctx.setSearchTerm(e.target.value)} />
    </div>
  );
}

function renderProvider(overrides = {}) {
  const defaults = {
    accessToken:      'ghp_test_token',
    user:             { id: 'user-1' },
    onSessionExpired: vi.fn(),
  };
  const { onSessionExpired, ...rest } = { ...defaults, ...overrides };
  return {
    onSessionExpired,
    ...render(
      <DashboardProvider accessToken={rest.accessToken} user={rest.user} onSessionExpired={onSessionExpired}>
        <ContextConsumer />
      </DashboardProvider>
    ),
  };
}

// ─── Default mock setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default: /repos succeeds, /pipeline/results succeeds
  mockApiRequest.mockImplementation((url) => {
    if (url === '/repos') {
      return Promise.resolve({ repositories: mockRepos });
    }
    if (url.includes('/api/pipeline/results')) {
      return Promise.resolve({ results: [mockHistoryRecord], total: 1 });
    }
    if (url === '/analyze') {
      return Promise.resolve({ decision: 'SAFE', riskScore: 20, source: 'ai-service' });
    }
    return Promise.resolve({});
  });
});

// ─── Initial load ─────────────────────────────────────────────────────────────

describe('DashboardContext — initial load', () => {
  it('starts in loading state', () => {
    renderProvider();
    expect(screen.getByTestId('repo-status').textContent).toBe('loading');
  });

  it('transitions to success and populates repositories', async () => {
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('repo-status').textContent).toBe('success');
    });
    expect(screen.getByTestId('repo-count').textContent).toBe('2');
  });

  it('fetches sidebar history on mount', async () => {
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('sidebar-count').textContent).toBe('1');
    });
  });

  it('shows error state when /repos fails', async () => {
    mockApiRequest.mockImplementation((url) => {
      if (url === '/repos') return Promise.reject(new Error('Network error'));
      return Promise.resolve({ results: [], total: 0 });
    });
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('repo-status').textContent).toBe('error');
    });
  });

  it('calls onSessionExpired when /repos returns 401', async () => {
    const onSessionExpired = vi.fn();
    mockApiRequest.mockImplementation((url) => {
      if (url === '/repos') return Promise.reject(new MockApiError('Unauthorized', 401));
      return Promise.resolve({ results: [], total: 0 });
    });
    renderProvider({ onSessionExpired });
    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalled();
    });
  });
});

// ─── handleAnalyze ────────────────────────────────────────────────────────────

describe('DashboardContext — handleAnalyze()', () => {
  it('transitions analysisState to loading immediately', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-status').textContent).toBe('success'));

    // Make /analyze hang so we can observe loading state
    mockApiRequest.mockImplementation((url) => {
      if (url === '/analyze') return new Promise(() => {});  // never resolves
      return Promise.resolve({ repositories: mockRepos });
    });

    fireEvent.click(screen.getByTestId('analyze-btn'));
    expect(screen.getByTestId('analysis-status').textContent).toBe('loading');
  });

  it('transitions to success after analyze completes', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-status').textContent).toBe('success'));

    fireEvent.click(screen.getByTestId('analyze-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('analysis-status').textContent).toBe('success');
    });
  });

  it('transitions to error when analyze rejects', async () => {
    mockApiRequest.mockImplementation((url) => {
      if (url === '/repos')    return Promise.resolve({ repositories: mockRepos });
      if (url.includes('pipeline')) return Promise.resolve({ results: [], total: 0 });
      if (url === '/analyze') return Promise.reject(new Error('Analyze failed'));
      return Promise.resolve({});
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-status').textContent).toBe('success'));

    fireEvent.click(screen.getByTestId('analyze-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('analysis-status').textContent).toBe('error');
    });
  });

  it('calls onSessionExpired when analyze returns 401', async () => {
    const onSessionExpired = vi.fn();
    mockApiRequest.mockImplementation((url) => {
      if (url === '/repos')    return Promise.resolve({ repositories: mockRepos });
      if (url.includes('pipeline')) return Promise.resolve({ results: [], total: 0 });
      if (url === '/analyze') return Promise.reject(new MockApiError('Unauthorized', 401));
      return Promise.resolve({});
    });
    renderProvider({ onSessionExpired });
    await waitFor(() => expect(screen.getByTestId('repo-status').textContent).toBe('success'));

    fireEvent.click(screen.getByTestId('analyze-btn'));
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });
});

// ─── deleteRecord ─────────────────────────────────────────────────────────────

describe('DashboardContext — deleteRecord()', () => {
  it('removes the record from sidebarHistory after successful delete', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('sidebar-count').textContent).toBe('1'));

    // DELETE call will resolve to {}
    fireEvent.click(screen.getByTestId('delete-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-count').textContent).toBe('0');
    });
  });
});

// ─── toggleSelect ─────────────────────────────────────────────────────────────

describe('DashboardContext — toggleSelect()', () => {
  it('adds an id to selectedIds on first toggle', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-status').textContent).toBe('success'));

    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('selected-ids-count').textContent).toBe('1');
  });

  it('removes the id on second toggle (deselect)', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-status').textContent).toBe('success'));

    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('selected-ids-count').textContent).toBe('0');
  });
});

// ─── deleteSelected ───────────────────────────────────────────────────────────

describe('DashboardContext — deleteSelected()', () => {
  it('is a no-op when selectedIds is empty', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('sidebar-count').textContent).toBe('1'));

    fireEvent.click(screen.getByTestId('bulk-del-btn'));

    // Should not change sidebar count since nothing was selected
    expect(screen.getByTestId('sidebar-count').textContent).toBe('1');
    // apiRequest should NOT have been called for delete
    const deleteCalls = mockApiRequest.mock.calls.filter(
      ([url, opts]) => opts?.method === 'DELETE'
    );
    expect(deleteCalls).toHaveLength(0);
  });

  it('removes all selected records and clears selectedIds after bulk delete', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('sidebar-count').textContent).toBe('1'));

    // Select one item
    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('selected-ids-count').textContent).toBe('1');

    // Bulk delete
    fireEvent.click(screen.getByTestId('bulk-del-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-ids-count').textContent).toBe('0');
      expect(screen.getByTestId('sidebar-count').textContent).toBe('0');
    });
  });
});

// ─── filteredRepositories ─────────────────────────────────────────────────────

describe('DashboardContext — filteredRepositories', () => {
  it('returns all repos when search is empty', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-count').textContent).toBe('2'));
    expect(screen.getByTestId('filtered-count').textContent).toBe('2');
  });

  it('filters repos by name', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-count').textContent).toBe('2'));

    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'repo-one' } });

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('1');
    });
  });

  it('returns empty list when no repos match the search', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('repo-count').textContent).toBe('2'));

    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'zzz-no-match' } });

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('0');
    });
  });
});

// ─── fetchSidebarHistory ──────────────────────────────────────────────────────

describe('DashboardContext — fetchSidebarHistory()', () => {
  it('refreshes history when called manually', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('sidebar-count').textContent).toBe('1'));

    // Override to return empty
    mockApiRequest.mockImplementation((url) => {
      if (url.includes('pipeline/results')) return Promise.resolve({ results: [], total: 0 });
      return Promise.resolve({ repositories: mockRepos });
    });

    fireEvent.click(screen.getByTestId('history-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-count').textContent).toBe('0');
    });
  });

  it('calls onSessionExpired when history fetch returns 401', async () => {
    const onSessionExpired = vi.fn();
    mockApiRequest.mockImplementation((url) => {
      if (url === '/repos') return Promise.resolve({ repositories: mockRepos });
      if (url.includes('pipeline/results')) {
        return Promise.reject(new MockApiError('Unauthorized', 401));
      }
      return Promise.resolve({});
    });
    renderProvider({ onSessionExpired });
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });
});
