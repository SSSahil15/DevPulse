/**
 * ErrorBoundary.test.jsx
 * ======================
 * Tests for the ErrorBoundary class component.
 * Verifies render, error capture, Sentry integration, and reset behaviour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ErrorBoundary from "../../components/ErrorBoundary";

// ─── Mock Sentry ──────────────────────────────────────────────────────────────
// We don't want real Sentry calls during tests, and we want to assert on them.

vi.mock("@sentry/react", () => ({
  captureException: vi.fn().mockReturnValue("test-event-id"),
  showReportDialog: vi.fn(),
  addBreadcrumb:    vi.fn(),
}));

import * as Sentry from "@sentry/react";

// ─── Component that throws on demand ─────────────────────────────────────────
function BrokenComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error("Intentional render error for testing");
  }
  return <div data-testid="healthy-content">Content rendered OK</div>;
}

// ─── Suppress console.error noise from React's error boundary machinery ───────
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ErrorBoundary", () => {
  describe("normal render (no error)", () => {
    it("renders children when no error is thrown", () => {
      render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.getByTestId("healthy-content")).toBeInTheDocument();
    });

    it("does not show fallback UI when children render successfully", () => {
      render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.queryByText(/encountered an error/i)).not.toBeInTheDocument();
    });
  });

  describe("error state (child throws)", () => {
    it("shows fallback UI when a child component throws", () => {
      render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/testpanel encountered an error/i)).toBeInTheDocument();
    });

    it("displays the error message from the thrown error", () => {
      render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText("Intentional render error for testing")).toBeInTheDocument();
    });

    it("shows the boundary name in the fallback title", () => {
      render(
        <ErrorBoundary name="AnalysisPanel">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/analysispanel encountered an error/i)).toBeInTheDocument();
    });

    it("shows a fallback panel name when no name prop is given", () => {
      render(
        <ErrorBoundary>
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/panel encountered an error/i)).toBeInTheDocument();
    });

    it("hides the healthy child content after an error", () => {
      render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.queryByTestId("healthy-content")).not.toBeInTheDocument();
    });
  });

  describe("Sentry integration", () => {
    it("calls Sentry.captureException when a child throws", () => {
      render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it("passes the Error object to Sentry.captureException", () => {
      render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      const [capturedError] = Sentry.captureException.mock.calls[0];
      expect(capturedError).toBeInstanceOf(Error);
      expect(capturedError.message).toBe("Intentional render error for testing");
    });

    it("includes boundary name as a Sentry tag", () => {
      render(
        <ErrorBoundary name="AICopilot">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      const [, options] = Sentry.captureException.mock.calls[0];
      expect(options?.tags?.errorBoundary).toBe("AICopilot");
    });
  });

  describe("reset behaviour", () => {
    it("hides the fallback UI and re-renders children after clicking 'Try again'", () => {
      const { rerender } = render(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Confirm error state is shown
      expect(screen.getByText(/testpanel encountered an error/i)).toBeInTheDocument();

      // Click try again
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      // Re-render with non-throwing child
      rerender(
        <ErrorBoundary name="TestPanel">
          <BrokenComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("healthy-content")).toBeInTheDocument();
    });
  });
});
