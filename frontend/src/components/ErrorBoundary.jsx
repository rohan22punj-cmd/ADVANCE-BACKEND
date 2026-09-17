import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In production, send to error monitoring service like Sentry
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle size={28} />
            </div>
            <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            <p className="mt-2 text-xs text-slate-400">
              An unexpected user interface error occurred. Your financial ledger data remains secure in the database.
            </p>
            {this.state.error && (
              <div className="mt-4 rounded-lg bg-slate-950/80 p-3 text-left font-mono text-[11px] text-rose-300 border border-slate-800 break-words">
                {this.state.error.message || 'Unknown render exception'}
              </div>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={this.handleReset}
                className="bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 flex items-center gap-2"
              >
                <RefreshCw size={15} />
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
