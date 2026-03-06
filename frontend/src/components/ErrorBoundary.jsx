import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary Component
 * Catches React errors and displays a fallback UI
 * FIX: Added proper error handling for the entire app
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-slate-800/50 border border-red-500/30 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle size={32} className="text-red-400" />
                        </div>
                        
                        <h1 className="text-xl font-bold text-white mb-2">
                            Something went wrong
                        </h1>
                        
                        <p className="text-slate-400 text-sm mb-6">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>

                        {/* Error details in development */}
                        {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
                            <div className="mb-6 p-3 bg-slate-900/50 rounded-lg text-left overflow-auto max-h-32">
                                <pre className="text-xs text-red-300 whitespace-pre-wrap">
                                    {this.state.error?.stack}
                                </pre>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <RefreshCw size={16} />
                                Reload Page
                            </button>
                            
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Home size={16} />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

