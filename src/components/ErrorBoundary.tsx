import React from 'react';

interface State {
    hasError: boolean;
    error: Error | null;
    componentStack: string | null;
}

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, componentStack: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, componentStack: null };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log full details so DevTools always shows the real cause, not minified error #XXX
        console.error('[ErrorBoundary] Caught error:', error.message);
        console.error('[ErrorBoundary] Stack:', error.stack);
        console.error('[ErrorBoundary] Component stack:', info.componentStack);
        this.setState({ componentStack: info.componentStack ?? null });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex h-screen items-center justify-center bg-[#0a0a0c] text-white p-6">
                    <div className="max-w-lg w-full bg-[#1a1a22] border border-red-500/30 rounded-xl p-8">
                        <h2 className="text-xl font-bold text-red-400 mb-3">描画エラーが発生しました</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            アプリの一部でエラーが発生しました。再読み込みで回復する場合があります。
                        </p>
                        <pre className="text-xs text-red-300/70 bg-black/40 rounded p-3 overflow-auto max-h-40 mb-4">
                            {this.state.error?.message}
                            {'\n'}
                            {this.state.error?.stack?.split('\n').slice(0, 6).join('\n')}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-white font-medium"
                        >
                            再読み込み
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
