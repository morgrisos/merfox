import React, { useEffect, useState } from 'react';

type InstallStatus = 'idle' | 'installing' | 'done' | 'error';

interface PlaywrightStatus {
    status: InstallStatus;
    error: string;
}

export function SetupOverlay({ children }: { children: React.ReactNode }) {
    const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');
    const [_errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const merfox = (window as any).merfox;
        if (!merfox) return;

        // 起動時に現在の状態をポーリング
        merfox.getPlaywrightStatus().then((data: PlaywrightStatus) => {
            setInstallStatus(data.status);
            setErrorMsg(data.error || '');
        });

        // リアルタイム更新を受け取る
        const unsubscribe = merfox.onPlaywrightStatus((data: PlaywrightStatus) => {
            setInstallStatus(data.status);
            setErrorMsg(data.error || '');
        });

        return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }, []);

    if (installStatus === 'installing') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0c]">
                <div className="text-center space-y-6 max-w-sm px-6">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-white text-lg font-medium">初回セットアップ中...</p>
                        <p className="text-gray-400 text-sm">
                            ブラウザエンジンをダウンロードしています。
                            <br />
                            インターネット接続を維持してください。
                        </p>
                        <p className="text-gray-500 text-xs pt-2">
                            完了後、自動的にアプリが起動します（約1〜3分）
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (installStatus === 'error') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0c]">
                <div className="text-center space-y-6 max-w-sm px-6">
                    <div className="text-4xl">⚠️</div>
                    <div className="space-y-3">
                        <p className="text-white text-lg font-medium">セットアップに失敗しました</p>
                        <p className="text-gray-400 text-sm">
                            ブラウザエンジンのダウンロードに失敗しました。
                            <br />
                            以下を確認してアプリを再起動してください：
                        </p>
                        <ul className="text-gray-400 text-sm text-left space-y-1 bg-gray-800 rounded-lg p-4">
                            <li>• インターネットに接続されているか</li>
                            <li>• ファイアウォールや社内プロキシが通信を遮断していないか</li>
                            <li>• ウイルス対策ソフトがブロックしていないか</li>
                        </ul>
                        <p className="text-gray-500 text-xs">
                            解決しない場合は配布者にご連絡ください
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium w-full transition-colors"
                    >
                        再試行
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
