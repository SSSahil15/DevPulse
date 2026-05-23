/**
 * useDashboard.test.js
 * ====================
 * Tests for the useDashboard custom hook.
 * Verifies that:
 *  1. It returns context when used inside a DashboardProvider
 *  2. It throws when used outside a DashboardProvider
 */
import React, { useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardProvider } from '../context/DashboardContext';

// ─── Mock api ────────────────────────────────────────────────────────────────

const { mockApiRequest } = vi.hoisted(() => {
  const mockApiRequest = vi.fn();
  return { mockApiRequest };
});

vi.mock('../api', () => ({
  apiRequest: (...args) => mockApiRequest(...args),
  ApiError: class ApiError extends Error {
    constructor(msg, status) { super(msg); this.status = status; }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue({ repositories: [], results: [] });
});

// ─── Helper components ────────────────────────────────────────────────────────

/** Consumer that renders context values */
function HookConsumer() {
  const ctx = useDashboard();
  return <div data-testid="ok">{ctx.repoState.status}</div>;
}

/** Consumer used outside provider — should throw */
function ThrowingConsumer() {
  useDashboard();          // no provider → should throw
  return <div />;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useDashboard — inside DashboardProvider', () => {
  it('returns context value without throwing', async () => {
    render(
      <DashboardProvider accessToken="tok" user={{ id: '1' }} onSessionExpired={vi.fn()}>
        <HookConsumer />
      </DashboardProvider>
    );
    // repoState starts as loading
    expect(screen.getByTestId('ok')).toBeInTheDocument();
  });

  it('exposes repoState.status', async () => {
    mockApiRequest.mockResolvedValue({ repositories: [] });
    render(
      <DashboardProvider accessToken="tok" user={{ id: '1' }} onSessionExpired={vi.fn()}>
        <HookConsumer />
      </DashboardProvider>
    );
    await waitFor(() =>
      expect(['loading', 'success', 'error']).toContain(
        screen.getByTestId('ok').textContent
      )
    );
  });
});

describe('useDashboard — outside DashboardProvider', () => {
  it('throws an error when used without a Provider', () => {
    // Suppress React's error boundary console.error noise
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThrowingConsumer />)).toThrow(
      'useDashboard must be used within a DashboardProvider'
    );
    consoleError.mockRestore();
  });
});
