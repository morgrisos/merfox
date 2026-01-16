import { useEffect, useState } from 'react';

const AppInfoCard = () => {
    const [appVersion, setAppVersion] = useState<string>('');
    const [logPath, setLogPath] = useState<string>('');

    useEffect(() => {
        // Fetch App Version via IPC
        if (typeof window !== 'undefined') {
            if ((window as any).merfox) {
                (window as any).merfox.getAppVersion().then(setAppVersion).catch(console.error);
            }
            if ((window as any).electron) {
                (window as any).electron.getLogPath().then(setLogPath).catch(console.error);
            }
        }
    }, []);

    const handleOpenReleases = () => {
        if ((window as any).merfox) {
            (window as any).merfox.openExternal('https://github.com/morgrisos/merfox/releases');
        }
    };

    const handleCopyVersion = () => {
        navigator.clipboard.writeText(appVersion);
        alert('バージョン番号をコピーしました: ' + appVersion);
    };

    const handleOpenLogFolder = () => {
        if ((window as any).electron) {
            (window as any).electron.openLogFolder();
        }
    };

    const handleCopyLogPath = () => {
        if (logPath) {
            navigator.clipboard.writeText(logPath);
            alert('ログパスをコピーしました:\n' + logPath);
        }
    };

    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    return (
        <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">アプリケーション情報</h2>

            <div className="space-y-6">
                {/* 1. Version Info */}
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">現在のバージョン</p>
                        <div className="flex items-center gap-2">
                            <p className="text-slate-900 dark:text-white font-mono text-2xl font-bold">v{appVersion || '---'}</p>
                            <button onClick={handleCopyVersion} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500" title="バージョンをコピー">
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleOpenReleases}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                        最新版を開く (GitHub Releases)
                    </button>
                </div>

                {/* 2. Manual Update Guide */}
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">更新手順 ({isMac ? 'macOS' : 'Windows'})</h3>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                        {isMac ? (
                            <ol className="list-decimal list-inside space-y-1">
                                <li>「最新版を開く」ボタンをクリック</li>
                                <li>最新の <strong>.dmg</strong> ファイルをダウンロード</li>
                                <li>ファイルをダブルクリックし、Applicationsフォルダへ上書きドラッグ</li>
                                <li>MerFoxを再起動 (警告が出た場合は設定で許可)</li>
                            </ol>
                        ) : (
                            <ol className="list-decimal list-inside space-y-1">
                                <li>「最新版を開く」ボタンをクリック</li>
                                <li>最新の <strong>.exe</strong> ファイルをダウンロード</li>
                                <li>インストーラーを実行して上書きインストール</li>
                                <li>MerFoxを再起動</li>
                            </ol>
                        )}
                    </div>
                </div>

                {/* 3. Log Access */}
                <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">トラブルシューティング</h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleOpenLogFolder}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">folder_open</span>
                            ログフォルダを開く
                        </button>
                        <button
                            onClick={handleCopyLogPath}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            ログパスをコピー
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        不具合報告の際は、上記フォルダ内の <code>main.log</code> を添付してください。
                    </p>
                </div>
            </div>
        </div>
    );
};

export const Settings = () => {
    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
            {/* Unified Page Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-surface-light/80 dark:bg-[#111418]/90 backdrop-blur-md px-4 sm:px-10 py-3 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-xl">settings</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">抽出設定</h2>
                </div>
            </header>

            <div className="flex flex-1 justify-center py-8 px-4 md:px-10 overflow-y-auto">
                <div className="flex flex-col max-w-[960px] flex-1 gap-6">

                    {/* [P1.7] Under Construction Warning (Unified Card Style) */}
                    <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-yellow-200 dark:border-yellow-900/50 shadow-sm flex items-start gap-4 ring-1 ring-yellow-500/20">
                        <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                            <span className="material-symbols-outlined text-xl">construction</span>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">設定機能は開発中です</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                現在、設定の永続化は未実装です。スクレイピングのパラメータは「スクレイパー」画面で都度指定してください。<br />
                                P2フェーズにて実装予定です。
                            </p>
                        </div>
                    </div>

                    {/* [P8.23] Application Information (Manual Update) */}
                    <AppInfoCard />

                    <div className="opacity-50 pointer-events-none grayscale-[0.5]">
                        <form className="flex flex-col gap-8" onSubmit={(e) => e.preventDefault()}>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">link</span>
                                    <h3 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">抽出対象</h3>
                                </div>
                                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex flex-col gap-6">
                                        <div className="flex flex-col gap-3">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">プラットフォーム選択</label>
                                            <div className="grid grid-cols-1 gap-4">
                                                <label className="relative flex cursor-pointer rounded-lg border-2 border-primary bg-primary/5 dark:bg-primary/10 p-3 shadow-sm focus:outline-none transition-all items-center justify-center">
                                                    <input defaultChecked disabled className="sr-only" name="platform" type="radio" value="mercari" />
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 dark:text-white">Mercari</span>
                                                        <span className="bg-red-500 rounded-full w-2 h-2"></span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-primary absolute top-2 right-2 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="url-input">ターゲットURL</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                                                </div>
                                                <input className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] text-slate-900 dark:text-white pl-10 pr-4 py-3 focus:border-primary focus:ring-primary sm:text-sm" id="url-input" placeholder="https://..." type="url" defaultValue="https://jp.mercari.com/search?keyword=vintage%20camera&status=on_sale" />
                                            </div>
                                            <div className="flex justify-between items-start flex-wrap gap-2">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    選択したプラットフォームの検索結果ページURLを入力してください。
                                                </p>
                                                <div className="flex gap-2">
                                                    <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">カテゴリ: カメラ</span>
                                                    <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20">ステータス: 販売中</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">tune</span>
                                    <h3 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">実行モード</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="relative flex cursor-pointer rounded-xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-4 shadow-sm focus:outline-none">
                                        <input defaultChecked className="sr-only" name="execution-mode" type="radio" value="onetime" />
                                        <span className="flex flex-1">
                                            <span className="flex flex-col">
                                                <span className="flex items-center gap-2 block text-sm font-bold text-slate-900 dark:text-white">
                                                    <span className="material-symbols-outlined text-primary">bolt</span>
                                                    1回のみ実行
                                                </span>
                                                <span className="mt-1 flex items-center text-sm text-slate-500 dark:text-slate-400">現在の検索結果から即座にリストを抽出し、終了します。</span>
                                                <span className="mt-4 text-xs font-medium text-primary">現在選択中</span>
                                            </span>
                                        </span>
                                        <span className="material-symbols-outlined text-primary absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    </label>
                                    <label className="relative flex cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none transition-all">
                                        <input className="sr-only" name="execution-mode" type="radio" value="periodic" />
                                        <span className="flex flex-1">
                                            <span className="flex flex-col">
                                                <span className="flex items-center gap-2 block text-sm font-bold text-slate-900 dark:text-white">
                                                    <span className="material-symbols-outlined text-slate-400">update</span>
                                                    定期監視
                                                </span>
                                                <span className="mt-1 flex items-center text-sm text-slate-500 dark:text-slate-400">指定間隔（X分ごと）でこのURLを継続的に監視し、新着商品をチェックします。</span>
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">save</span>
                                    <h3 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">出力と保存</h3>
                                </div>
                                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">出力先ローカルパス</label>
                                        <div className="flex items-center gap-2 font-mono text-sm bg-slate-100 dark:bg-[#101822] px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 w-full md:w-auto overflow-x-auto">
                                            <span className="material-symbols-outlined text-base">folder_open</span>
                                            ./data/exports/mercari_export_v1.csv
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <input className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 bg-transparent" id="append-mode" type="checkbox" />
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="append-mode">ファイルに追記する</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="sticky bottom-0 -mx-4 md:-mx-10 p-4 md:px-10 bg-surface-light/80 dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 mt-4">
                                <button className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" type="button">
                                    設定をリセット
                                </button>
                                <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95" type="button">
                                    <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                                    保存してスクレイパーを起動
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
