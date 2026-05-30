import { Component } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import * as Sentry from '@sentry/react';

/**
 * ErrorBoundary — catches React render errors and shows a styled fallback UI.
 *
 * Props:
 *   children  {ReactNode}  - Content to protect
 *   name      {string}     - Panel/section name shown in the fallback UI and
 *                            sent to Sentry as context. Defaults to "panel".
 *
 * Reports every caught error to Sentry with:
 *   - The full component stack trace
 *   - The boundary name (for filtering in Sentry)
 *   - The error event ID (shown to the user so they can reference it in reports)
 *
 * Usage:
 *   <ErrorBoundary name="AnalysisPanel">
 *     <AnalysisPanel ... />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const boundaryName = this.props.name || 'unknown';

    // Capture to Sentry with rich context
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack,
          boundary: boundaryName,
        },
      },
      tags: {
        errorBoundary: boundaryName,
      },
    });

    this.setState({ eventId });

    // Also log to console for local debugging
    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary:${boundaryName}] Caught error:`, error, info.componentStack);
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null, eventId: null });
  }

  render() {
    if (this.state.hasError) {
      const name = this.props.name || 'panel';
      const eventId = this.state.eventId;

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-10 rounded-2xl bg-red-500/5 ring-1 ring-red-500/20 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>

          <div>
            <p className="text-sm font-semibold text-red-300 capitalize">
              {name} encountered an error
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {this.state.error?.message || 'An unexpected error occurred in this panel.'}
            </p>
            {eventId && (
              <p className="text-xs text-slate-600 mt-1 font-mono">
                Error ID: {eventId.slice(0, 8)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => this.handleReset()}
              className="flex items-center gap-2 text-xs font-medium px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg ring-1 ring-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>

            {eventId && (
              <button
                onClick={() => Sentry.showReportDialog({ eventId })}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg ring-1 ring-white/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Report issue
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
