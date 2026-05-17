import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * ErrorBoundary — catches React render errors and shows a styled fallback.
 * Wrap around major panels (AnalysisPanel, AICopilot) to prevent full-page crashes.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-10 rounded-2xl bg-red-500/5 ring-1 ring-red-500/20 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-300">Something went wrong</p>
            <p className="text-xs text-slate-500 mt-1">
              {this.state.error?.message || "An unexpected error occurred in this panel."}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 text-xs font-medium px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg ring-1 ring-white/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
