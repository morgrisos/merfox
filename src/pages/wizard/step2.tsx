import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { useScraper } from '@/hooks/useScraper';
import { Loader2, StopCircle, CheckCircle, AlertTriangle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useOutcome } from '@/contexts/OutcomeContext';
import { AppShell } from '@/components/layout/AppShell';

export default function Step2_Extract() {
    const router = useRouter();
    const { status, stats, startScraping, stopScraping, logs, isTestComplete, latestRunId } = useScraper();
    const { setOutcome } = useOutcome();
    const [hasStarted, setHasStarted] = useState(false);
    const [showConditions, setShowConditions] = useState(false);

    // Auto-start
    useEffect(() => {
        if (!hasStarted && status === 'IDLE' && !isTestComplete) {
            setHasStarted(true);
            startScraping(true);
        }
    }, [hasStarted, status, startScraping, isTestComplete]);

    // Completion / Auto-transition Logic
    useEffect(() => {
        if (isTestComplete || status === 'COMPLETED' || status === 'ERROR') {
            setOutcome({
                success: status !== 'ERROR' && stats.newItems > 0,
                // [FIX] Use Real Run ID from Hook (Backend Generated)
                latestRunId: latestRunId || 'latest',
                itemsCount: stats.newItems,
                failedCount: stats.failed
            } as any);

            // Auto-transition on Error or 0 items
            if (status === 'ERROR' || stats.newItems === 0) {
                setTimeout(() => {
                    router.push('/wizard/step3?mode=diagnosis');
                }, 2000);
            }
        }
    }, [status, stats, router, isTestComplete, setOutcome]);

    const handleNext = () => {
        router.push('/wizard/step3?mode=success');
    };

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <div className="max-w-3xl mx-auto w-full space-y-6">

                {/* Main Completion Card */}
                <Card className="border border-app-border bg-app-surface text-white overflow-hidden shadow-lg">
                    <CardContent className="p-8 flex flex-col items-center space-y-8">

                        {/* 1. Header & Status */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative inline-flex items-center justify-center">
                                <div className={`absolute w-24 h-24 rounded-full ${status === 'RUNNING' ? 'bg-blue-500/20 animate-ping' : 'bg-transparent'}`} />
                                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl ${status === 'RUNNING' ? 'border-blue-500 bg-app-base' :
                                    status === 'COMPLETED' || isTestComplete ? 'border-primary bg-primary/10' :
                                        'border-red-500 bg-red-500/10'
                                    }`}>
                                    {status === 'RUNNING' ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> :
                                        status === 'COMPLETED' || isTestComplete ? <CheckCircle className="w-8 h-8 text-primary" /> :
                                            <AlertTriangle className="w-8 h-8 text-red-500" />}
                                </div>
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    {status === 'RUNNING' ? '抽出しています...' : (stats.newItems > 0 ? '抽出完了' : '抽出終了')}
                                </h2>
                                <p className="text-app-text-muted text-sm">
                                    {status === 'RUNNING' ? '対象ページを解析し、商品データを収集しています' :
                                        stats.newItems > 0 ? '正常に商品データが取得されました' : '条件に一致する商品が見つかりませんでした'}
                                </p>
                            </div>
                        </div>

                        {/* 2. Stats */}
                        {/* 2. Stats Breakdown */}
                        <div className="w-full max-w-md mx-auto border-t border-b border-app-border py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-8 text-center">
                                <div>
                                    <p className="text-xs text-app-text-muted uppercase font-bold tracking-wider mb-1">取得件数</p>
                                    <span className="text-2xl font-mono text-white">{stats.totalItems || 0}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-app-text-muted uppercase font-bold tracking-wider mb-1">通過 (Success)</p>
                                    <span className={`text-3xl font-mono font-bold ${stats.newItems > 0 ? 'text-primary' : 'text-app-text-muted'}`}>
                                        {stats.newItems} <span className="text-base font-normal text-app-text-muted">件</span>
                                    </span>
                                </div>
                            </div>

                            {/* Excluded Section */}
                            <div className="bg-red-900/10 rounded p-3 border border-red-900/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-red-400">除外 (Excluded)</span>
                                    <span className="text-sm font-mono font-bold text-red-400">
                                        {stats.excluded.ngWord + stats.excluded.shops + stats.excluded.unknown + stats.excluded.shipping + stats.excluded.highPrice} 件
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-app-text-muted">
                                    <div className="flex justify-between"><span>NGワード:</span> <span className="font-mono text-red-300">{stats.excluded.ngWord}</span></div>
                                    <div className="flex justify-between"><span>ショップ:</span> <span className="font-mono">{stats.excluded.shops}</span></div>
                                    <div className="flex justify-between"><span>送料別:</span> <span className="font-mono">{stats.excluded.shipping}</span></div>
                                    <div className="flex justify-between"><span>その他:</span> <span className="font-mono">{stats.excluded.unknown}</span></div>
                                </div>
                            </div>

                            {/* Low Results Warning */}
                            {status === 'COMPLETED' && stats.newItems <= 5 && (
                                <div className="text-xs text-yellow-500 bg-yellow-900/10 p-3 rounded border border-yellow-900/20">
                                    <p className="font-bold mb-1"><AlertTriangle className="w-3 h-3 inline mr-1" /> 抽出件数が少ない可能性があります</p>
                                    <ul className="list-disc list-inside opacity-80 text-[10px]">
                                        <li>NGワードが多すぎる</li>
                                        <li>キーワードが広すぎる/狭すぎる</li>
                                        <li>出品数が少ない時間帯</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 3. CTA Buttons */}
                        <div className="w-full max-w-sm pt-2">
                            {status === 'RUNNING' ? (
                                <Button size="lg" variant="danger" className="w-full h-12 text-base font-bold shadow-lg bg-red-500 hover:bg-red-600 border-none" onClick={stopScraping}>
                                    <StopCircle className="mr-2 h-5 w-5" /> 停止する
                                </Button>
                            ) : (stats.newItems > 0) ? (
                                <Button size="lg" className="w-full h-14 text-lg font-bold bg-primary hover:bg-blue-600 text-white shadow-xl transform transition-transform hover:scale-[1.02]" onClick={handleNext}>
                                    次へ（確認） <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            ) : (
                                <div className="text-center text-sm text-app-text-muted animate-pulse py-2">
                                    診断画面へ移動中...
                                </div>
                            )}
                        </div>

                        {/* 4. Conditions Summary (Collapsible) */}
                        <div className="w-full max-w-lg mt-4">
                            <button
                                onClick={() => setShowConditions(!showConditions)}
                                className="w-full flex items-center justify-center gap-2 text-xs text-app-text-muted hover:text-white transition-colors py-2"
                            >
                                {showConditions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                <span>使用した条件 ({showConditions ? '閉じる' : '詳細を表示'})</span>
                            </button>

                            {showConditions && (
                                <div className="mt-4 p-4 rounded-lg bg-app-element border border-app-border text-left w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="text-xs font-bold text-app-text-muted mb-3 uppercase tracking-wider">設定 (20件)</div>
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-sm text-white">
                                                <CheckCircle className="w-4 h-4 text-primary" /> <span>ショップ除外: <span className="font-bold">ON</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-app-text-muted">
                                                <div className="w-4 h-4 border border-app-text-muted rounded-sm"></div> <span>送料込みのみ: <span className="font-mono">未指定</span></span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-blue-300 mt-2 pt-2 border-t border-white/5">
                                            ※ テスト実行: 最大20件で制限中
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </CardContent>
                </Card>

                {/* Logs Area (Outside Card) */}
                <div className="w-full">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-xs font-bold text-app-text-muted uppercase tracking-wider">実行ログ</span>
                        <span className="text-xs text-app-text-muted font-mono">{logs.length} events</span>
                    </div>
                    <div className="bg-black/40 border border-app-border rounded-lg overflow-hidden backdrop-blur-sm">
                        <div className="h-48 overflow-auto p-4 font-mono text-xs space-y-1.5 custom-scrollbar">
                            {logs && logs.length > 0 ? (
                                logs.slice().reverse().map((log, i) => (
                                    <div key={i} className="flex gap-3 text-app-text-muted hover:text-white/90 transition-colors">
                                        <span className="opacity-50 shrink-0 select-none">[{log.timestamp}]</span>
                                        <span className={log.message.includes('Error') ? 'text-red-400' : log.message.includes('Success') || log.message.includes('Found') ? 'text-primary' : ''}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-app-text-muted opacity-50 italic px-2">ログ待機中...</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

Step2_Extract.getLayout = (page: React.ReactElement) => <AppShell variant="wizard">{page}</AppShell>;
