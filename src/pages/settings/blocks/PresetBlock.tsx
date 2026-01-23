import clsx from 'clsx';
import { useSettings } from '../../../hooks/useSettings';
import { CardHeader, Section } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/Badge';
import { WatchInterval } from '../../../lib/types';

export const PresetBlock = () => {
    const { settings, updateSettings, applyPreset } = useSettings();
    const { preset, collectionMode, watchInterval } = settings;

    return (
        <Section>
            <CardHeader title="2. プリセット" icon="tune" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                    className={clsx(
                        "relative flex cursor-pointer rounded-xl border-2 p-4 shadow-sm transition-all",
                        preset === 'beginner'
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                    onClick={() => applyPreset('beginner')}
                >
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">初心者 (おすすめ)</span>
                            <Badge variant="success">推奨</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            安全重視の設定です。Shopsや怪しい商品を除外し、新着監視モード(25分間隔)で実行します。
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">Shops除外</span>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">安全装置ON</span>
                        </div>
                    </div>
                    {preset === 'beginner' && <span className="material-symbols-outlined text-primary absolute top-4 right-4">check_circle</span>}
                </div>

                <div
                    className={clsx(
                        "relative flex cursor-pointer rounded-xl border-2 p-4 shadow-sm transition-all",
                        preset === 'custom'
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                    onClick={() => applyPreset('custom')}
                >
                    <div className="flex flex-col gap-1 w-full relative z-10">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">カスタム</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            収集モードや監視間隔を自由に設定できます。
                        </p>

                        {preset === 'custom' && (
                            <div className="mt-4 flex flex-col gap-3 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <button
                                        className={clsx("flex-1 text-xs font-bold py-1.5 rounded transition-colors", collectionMode === 'bulk' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700")}
                                        onClick={() => updateSettings({ collectionMode: 'bulk' })}
                                    >
                                        Bulk (大量収集)
                                    </button>
                                    <button
                                        className={clsx("flex-1 text-xs font-bold py-1.5 rounded transition-colors", collectionMode === 'watch' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700")}
                                        onClick={() => updateSettings({ collectionMode: 'watch' })}
                                    >
                                        Watch (新着監視)
                                    </button>
                                </div>
                                {collectionMode === 'watch' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">監視間隔:</span>
                                        <select
                                            className="block flex-1 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] text-xs py-1"
                                            value={watchInterval}
                                            onChange={(e) => updateSettings({ watchInterval: Number(e.target.value) as WatchInterval })}
                                        >
                                            <option value={25}>25分 (推奨)</option>
                                            <option value={30}>30分</option>
                                            <option value={45}>45分</option>
                                            <option value={60}>60分</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {preset === 'custom' && <span className="material-symbols-outlined text-primary absolute top-4 right-4">check_circle</span>}
                </div>
            </div>
        </Section>
    );
};
