import * as React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    moduleName?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({ errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    private handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    private handleGoHome = (): void => {
        window.location.href = '/';
    };

    public render(): React.ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-6">
                    <div className="max-w-md w-full">
                        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                {this.props.moduleName ? `${this.props.moduleName} Error` : 'Something went wrong'}
                            </h2>
                            
                            <p className="text-gray-500 mb-6">
                                {this.props.moduleName 
                                    ? `The ${this.props.moduleName} module encountered an error. You can try reloading it or go back to the dashboard.`
                                    : 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
                            </p>
                            
                            {this.state.error && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-xl text-left">
                                    <p className="text-xs font-mono text-red-600 break-all">
                                        {this.state.error.message}
                                    </p>
                                    {this.state.errorInfo && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                                View stack trace
                                            </summary>
                                            <pre className="mt-2 text-xs font-mono text-gray-600 overflow-auto max-h-32 p-2 bg-gray-100 rounded">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={this.handleRetry}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                                >
                                    <RefreshCw size={16} />
                                    Try Again
                                </button>
                                <button
                                    onClick={this.handleGoHome}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                                >
                                    <Home size={16} />
                                    Go Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
