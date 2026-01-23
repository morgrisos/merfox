import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { useScraper } from '@/hooks/useScraper';
import { Loader2, StopCircle, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useOutcome } from '@/contexts/OutcomeContext';
import { WizardLayout } from '@/components/layout/WizardLayout';

export default function Step2_Extract() {
    const router = useRouter();
    const { status, stats, startScraping, stopScraping, logs, isTestComplete } = useScraper();
    const { setOutcome } = useOutcome();
    const [hasStarted, setHasStarted] = useState(false);

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
                // Cast to any to inject latestRunId if missing from type definition, or remove if not needed yet
                latestRunId: '4b221f9c-9f80-4be3-99dc-58545e6ae503',
                itemsCount: stats.newItems,
                failedCount: stats.failed
            } as any);

            // 3B-3: Auto-transition if 0 items or Error
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
        <div className="flex flex-col items-center justify-center py-6">
            <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mx-auto">
                {/* 3B-3 Left Column: Settings (Minimal) */}
                <Card className="col-span-1 border border-[#282f39] bg-[#111418] shadow-sm h-fit text-white rounded-lg">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base font-bold text-white">設定 (20件)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm pb-6">
                        <div className="space-y-4">
                            <div>
                                <div className="text-[#9da8b9] text-xs mb-1">基本フィルタ</div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-xs text-white">
                                        <CheckCircle className="w-3 h-3 text-green-500" /> ショップ除外
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#9da8b9]">
                                        <div className="w-3 h-3 border border-[#9da8b9] rounded-sm"></div> 送料込みのみ (未指定)
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded text-xs text-blue-300">
                                安心文: まずは20件で確認してから本番がおすすめです。
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3B-3 Right Column: Progress */}
                <Card className="col-span-2 border-none shadow-none bg-transparent flex flex-col items-center justify-center space-y-8 text-white">
                    {/* Status Icon */}
                    <div className="relative inline-flex items-center justify-center">
                        <div className={`absolute w-32 h-32 rounded-full ${status === 'RUNNING' ? 'bg-blue-500/20 animate-ping' : 'bg-[#111418]'}`} />
                        <div className="relative w-28 h-28 bg-[#111418] rounded-full flex items-center justify-center border-4 border-blue-500 shadow-xl">
                            {status === 'RUNNING' ? <Loader2 className="w-10 h-10 text-blue-500 animate-spin" /> :
                                status === 'COMPLETED' || isTestComplete ? <CheckCircle className="w-10 h-10 text-green-500" /> :
                                    <AlertTriangle className="w-10 h-10 text-red-500" />}
                        </div>
                    </div>

                    {/* Text Status */}
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-white">
                            {status === 'RUNNING' ? '抽出しています...' : (stats.newItems > 0 ? '抽出完了' : '抽出終了')}
                        </h2>
                        <div className="text-base text-[#9da8b9] space-y-1">
                            {/* Fixed: stats.totalPages -> stats.totalItems */}
                            <p>検出アイテム: <span className="text-white font-mono">{stats.totalItems || 0}</span></p>
                            <p>取得件数: <span className="text-blue-400 font-bold font-mono text-xl">{stats.newItems}</span> 件</p>
                        </div>
                    </div>

                    {/* 3B-3 Buttons (State based) */}
                    <div className="w-full max-w-sm">
                        {status === 'RUNNING' ? (
                            <Button size="lg" variant="danger" className="w-full h-12 text-base font-bold shadow-lg" onClick={stopScraping}>
                                <StopCircle className="mr-2 h-5 w-5" /> 停止する
                            </Button>
                        ) : (stats.newItems > 0) ? (
                            <div className="space-y-3">
                                <Button size="lg" className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg" onClick={handleNext}>
                                    次へ（確認） <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center text-sm text-[#9da8b9] animate-pulse">
                                診断へ移動中...
                            </div>
                        )}
                    </div>

                    {/* Logs */}
                    <div className="w-full h-40 bg-[#0d1117] border border-[#282f39] text-green-400 font-mono text-xs p-4 rounded-lg overflow-hidden shadow-inner opacity-80">
                        <div className="flex flex-col-reverse h-full overflow-auto custom-scrollbar">
                            {logs?.slice(-10).map((log, i) => (
                                <div key={i} className="border-b border-[#282f39]/50 py-1">{log.timestamp} {log.message}</div>
                            )) || "ログ待機中..."}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

Step2_Extract.getLayout = (page: React.ReactElement) => <WizardLayout>{page}</WizardLayout>;
