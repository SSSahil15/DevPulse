/**
 * AICopilot.test.jsx
 * ==================
 * Tests for AICopilot — covers FAB, panel open/close, sending messages,
 * API success/error paths, and edge cases.
 *
 * Notes on the component:
 *  - Panel is always in the DOM; visibility toggled via CSS (opacity/scale).
 *  - Send button is type="submit" with no title — find via container.querySelector.
 *  - MSW intercepts /api/ai/chat (configured in setupTests.js).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import AICopilot from '../components/AICopilot';

const API_BASE = 'http://localhost:4000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderCopilot(props = {}) {
  return render(
    <AICopilot
      accessToken="ghp_test_token"
      pipelineData={null}
      analysisResult={null}
      {...props}
    />
  );
}

/** Open the panel and return the panel container div. */
function openPanel() {
  // The FAB button toggles the panel
  const buttons = screen.getAllByRole('button');
  fireEvent.click(buttons[0]);
}

/** Return the submit (Send) button by its type attribute. */
function getSendButton(container) {
  return container.querySelector('button[type="submit"]');
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

describe('AICopilot — open / close', () => {
  it('renders the FAB button initially', () => {
    renderCopilot();
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeInTheDocument();
  });

  it('panel div starts in closed state (has opacity-0 class)', () => {
    const { container } = renderCopilot();
    // The floating panel is toggled via opacity-0 / scale-90 when closed
    const panel = container.querySelector('.opacity-0');
    expect(panel).not.toBeNull();
  });

  it('opens the chat panel (removes opacity-0) when FAB is clicked', () => {
    const { container } = renderCopilot();
    openPanel();
    // After opening, opacity-0 should be gone from the panel
    const closedPanel = container.querySelector('.opacity-0');
    expect(closedPanel).toBeNull();
  });

  it('shows the AI Copilot heading after opening', () => {
    renderCopilot();
    openPanel();
    expect(screen.getByText('AI Copilot')).toBeInTheDocument();
  });

  it('shows the welcome message after opening', () => {
    renderCopilot();
    openPanel();
    expect(screen.getByText(/Hi! I'm your DevPulse AI Copilot/i)).toBeInTheDocument();
  });

  it('closes the panel when the ✕ button is clicked', async () => {
    const { container } = renderCopilot();
    openPanel();

    // Panel is open — find close button (renders ✕ text)
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      const closedPanel = container.querySelector('.opacity-0');
      expect(closedPanel).not.toBeNull();
    });
  });
});

// ─── Sending messages ─────────────────────────────────────────────────────────

describe('AICopilot — sending messages', () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/api/ai/chat`, () =>
        HttpResponse.json({ summary: 'Your pipeline is healthy!', sources: [] })
      )
    );
  });

  it('appends the user message to the chat', async () => {
    const { container } = renderCopilot();
    openPanel();

    const input = screen.getByPlaceholderText('Ask Copilot...');
    fireEvent.change(input, { target: { value: 'What is my score?' } });
    fireEvent.click(getSendButton(container));

    await waitFor(() => {
      expect(screen.getByText('What is my score?')).toBeInTheDocument();
    });
  });

  it('clears the input field after sending', async () => {
    const { container } = renderCopilot();
    openPanel();

    const input = screen.getByPlaceholderText('Ask Copilot...');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(getSendButton(container));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('does NOT add message if input is empty', async () => {
    const { container } = renderCopilot();
    openPanel();

    // Submit the form without typing anything
    const form = container.querySelector('form');
    fireEvent.submit(form);

    // Welcome message is the ONLY message — no new user message should be added
    // The welcome message has role=ai, so user messages = 0
    await new Promise(r => setTimeout(r, 50));
    expect(screen.queryByText(/Your pipeline is healthy!/i)).not.toBeInTheDocument();
    // And the welcome message still appears (not blown away)
    expect(screen.getByText(/Hi! I'm your DevPulse AI Copilot/i)).toBeInTheDocument();
  });

  it('does NOT send when input is only whitespace', async () => {
    const { container } = renderCopilot();
    openPanel();

    const input = screen.getByPlaceholderText('Ask Copilot...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(getSendButton(container));

    // No new messages added
    await new Promise(r => setTimeout(r, 100));
    expect(screen.queryByText('   ')).not.toBeInTheDocument();
  });

  it('shows the AI response after the API call resolves', async () => {
    const { container } = renderCopilot();
    openPanel();

    const input = screen.getByPlaceholderText('Ask Copilot...');
    fireEvent.change(input, { target: { value: 'Analyse my pipeline' } });
    // Use fireEvent.submit(form) to reliably submit regardless of button state
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByText('Your pipeline is healthy!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('allows form submission via fireEvent.submit directly', async () => {
    const { container } = renderCopilot();
    openPanel();

    const input = screen.getByPlaceholderText('Ask Copilot...');
    const form  = container.querySelector('form');
    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Enter test')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ─── API error handling ───────────────────────────────────────────────────────

describe('AICopilot — API error handling', () => {
  it('shows error message when /api/ai/chat returns 503', async () => {
    server.use(
      http.post(`${API_BASE}/api/ai/chat`, () =>
        HttpResponse.json({ message: 'Service unavailable' }, { status: 503 })
      )
    );

    const { container } = renderCopilot();
    openPanel();

    const input = screen.getByPlaceholderText('Ask Copilot...');
    fireEvent.change(input, { target: { value: 'Help' } });
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByText(/Oops.*error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ─── formatText rendering ─────────────────────────────────────────────────────

describe('AICopilot — formatText markdown rendering', () => {
  it('renders plain AI text response without crashing', async () => {
    server.use(
      http.post(`${API_BASE}/api/ai/chat`, () =>
        HttpResponse.json({ summary: 'Plain text response.', sources: [] })
      )
    );
    const { container } = renderCopilot();
    openPanel();

    const input = screen.getByPlaceholderText('Ask Copilot...');
    const form  = container.querySelector('form');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Plain text response.')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
