'use client';

import React, { useEffect, useState } from 'react';
import { useAppError } from '@/contexts/AppErrorContext';

export const AppErrorModal = () => {
    const { error, clearError } = useAppError();
    const [isExpanded, setIsExpanded] = useState(false);
    const [logPath, setLogPath] = useState<string>('');
    const [appVersion, setAppVersion] = useState<string>('unknown');

    // Fetch env info on mount (or when error appears)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if ((window as any).merfox) {
                (window as any).merfox.getAppVersion().then(setAppVersion).catch(() => { });
            }
            if ((window as any).electron) {
                (window as any).electron.getLogPath().then(setLogPath).catch(() => { });
            }
        }
    }, [error]);

    if (!error) return null;

    const handleCopyReport = async () => {
        const timestamp = new Date().toISOString();
        const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';

        const report = `[MerFox Error Report]
timestamp: ${timestamp}
version: ${appVersion}
platform: ${platform}
screen: ${error.screen || 'unknown'}
action: ${error.action || 'unknown'}

error:
  name: ${error.name || 'Error'}
  message: ${error.message}

stack:
${error.stack || 'N/A'}

notes:
- logs: ${logPath || 'Check Settings > Troubleshooting'}
- if reproducible: steps: 1) ... 2) ... 3) ...
`;

        try {
            await navigator.clipboard.writeText(report);
            alert('レポートをコピーしました。サポート窓口に貼り付けてください。');
        } catch (e) {
            console.error('Copy failed', e);
            alert('コピーに失敗しました。');
        }
    };

    const handleOpenLogFolder = () => {
        if ((window as any).electron) {
            (window as any).electron.openLogFolder();
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full shadow-2xl border border-red-200 dark:border-red-900/50 flex flex-col overflow-hidden max-h-[90vh]">

                {/* Header */}
                <div className="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">error</span>
                    <h2 className="text-lg font-bold text-red-700 dark:text-red-300">エラーが発生しました</h2>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <p className="text-slate-700 dark:text-slate-300 mb-4 font-medium leading-relaxed">
                        予期せぬエラーが発生しました。<br />
                        サポートへの報告にご協力をお願いします。
                    </p>

                    <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mb-4 font-mono text-xs text-red-600 dark:text-red-400 break-words whitespace-pre-wrap">
                        {error.message}
                    </div>

                    {/* Details Toggle */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 flex items-center gap-1 mb-2"
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                        詳細情報 (Stack Trace)
                    </button>

                    {isExpanded && (
                        <div className="bg-slate-900 text-slate-400 p-3 rounded-lg text-[10px] font-mono whitespace-pre overflow-x-auto max-h-40 border border-slate-700">
                            {error.stack || 'No stack trace available.'}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                        onClick={handleOpenLogFolder}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                    >
                        ログフォルダを開く
                    </button>
                    <button
                        onClick={clearError}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                    >
                        閉じる
                    </button>
                    <button
                        onClick={handleCopyReport}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        コピーしてサポートへ
                    </button>
                </div>
            </div>
        </div>
    );
};
