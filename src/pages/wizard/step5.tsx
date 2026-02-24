import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { useOutcome } from '@/contexts/OutcomeContext';
import { Loader2, ArrowRight, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import axios from 'axios';
import { AppShell } from '@/components/layout/AppShell';

export default function Step5_Convert() {
    const router = useRouter();
    const { outcome } = useOutcome();
    const runId = (outcome as any).latestRunId || '4b221f9c-9f80-4be3-99dc-58545e6ae503';

    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const startConversion = async () => {
        if (status === 'running') return;
        setStatus('running');
        setErrorMsg('');

        try {
            // Updated API path: /api/runs/[runId]/convert
            const res = await axios.post(`/api/runs/${runId}/convert`);

            if (res.data.success) {
                setResult(res.data);
                setStatus('success');
            } else {
                setErrorMsg('Conversion failed on server.');
                setStatus('error');
            }
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.response?.data?.error || e.message || 'Unknown error');
            setStatus('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <Card className="max-w-xl w-full border border-app-border bg-app-surface shadow-none flex flex-col items-center justify-center space-y-8 p-8 text-white rounded-xl">
                {/* 3B-6 Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-white">Amazon用TSVに変換します</h1>
                    <p className="text-app-text-muted text-sm">
                        このRunのデータとmappingを使って変換します。<br />
                        （ファイル選択は不要です）
                    </p>
                </div>

                {/* 3B-6 Input Visualization (Read-only) */}
                <div className="flex items-center gap-4 text-xs text-app-text-muted bg-app-element p-3 rounded-lg border border-app-border">
                    <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" /> raw.json (自動)
                    </div>
                    <span className="text-app-border">|</span>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">table_chart</span> mapping.csv (自動)
                    </div>
                </div>

                {/* Status Visualization */}
                <div className="relative inline-flex items-center justify-center py-4">
                    <div className={`absolute w-40 h-40 rounded-full ${status === 'running' ? 'bg-purple-500/20 animate-ping' : 'bg-transparent'}`} />
                    <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-xl transition-all ${status === 'running' ? 'border-purple-500 bg-app-base' :
                        status === 'success' ? 'border-primary bg-app-base' :
                            status === 'error' ? 'border-red-500 bg-app-base' :
                                'border-app-border bg-app-base'
                        }`}>
                        {status === 'running' ? <Loader2 className="w-12 h-12 text-purple-500 animate-spin" /> :
                            status === 'success' ? <CheckCircle className="w-12 h-12 text-primary" /> :
                                status === 'error' ? <AlertCircle className="w-12 h-12 text-red-500" /> :
                                    <ArrowRight className="w-12 h-12 text-blue-500" />
                        }
                    </div>
                </div>

                {/* ⚠️ TSV Fixed-Value Warning Banner — display only, no logic change */}
                <div className="w-full border border-orange-500/60 bg-orange-950/40 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-orange-300 font-semibold">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>TSV固定値の警告 — 出品前に必ず確認してください</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-orange-200/80 text-xs list-disc">
                        <li>現状、Amazon TSVは <code className="bg-orange-900/50 px-1 rounded">item-condition</code> が全件<strong>「中古-良(11)」</strong>で固定です</li>
                        <li><code className="bg-orange-900/50 px-1 rounded">leadtime-to-ship</code> が全件<strong>「2日」</strong>で固定です</li>
                        <li><code className="bg-orange-900/50 px-1 rounded">item-note</code> は<strong>「中古品です。」</strong>固定です</li>
                    </ul>
                    <p className="ml-6 text-orange-300 text-xs font-medium">
                        このまま出品するとクレーム/停止リスクがあります。出品前に内容を確認してください。
                    </p>
                    <p className="ml-6 text-orange-200/50 text-xs">
                        今後：出品用の設定（状態/発送日数/説明）をWizardで指定できるようにする予定
                    </p>
                </div>

                {/* 3B-6 Main CTA (State Based) */}

                <div className="w-full space-y-4">
                    {status === 'idle' && (
                        <Button
                            size="lg"
                            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg"
                            onClick={startConversion}
                        >
                            変換する
                        </Button>
                    )}

                    {status === 'running' && (
                        <p className="text-center text-app-text-muted animate-pulse">
                            変換処理を実行中...
                        </p>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4">
                            <div className="text-center text-red-400 text-sm">
                                {errorMsg || "変換に失敗しました。"}
                            </div>
                            <Button
                                variant="danger"
                                size="lg"
                                className="w-full h-12"
                                onClick={startConversion}
                            >
                                再試行
                            </Button>
                        </div>
                    )}

                    {status === 'success' && result && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                            {/* Result Stats */}
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-3xl font-bold text-primary">{result.amazon_rows ?? 0}</p>
                                    <p className="text-xs text-app-text-muted">変換成功</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-400">{result.failed_rows ?? 0}</p>
                                    <p className="text-xs text-app-text-muted">対象外/失敗</p>
                                </div>
                            </div>

                            {/* 3B-6 Success CTA */}
                            <Button
                                size="lg"
                                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg"
                                onClick={() => router.push('/wizard/step6')}
                            >
                                次へ（最終TSV） <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>

                            {/* Failure Handling Link */}
                            {result.failed_rows > 0 && (
                                <button className="w-full text-center text-xs text-red-400 hover:text-red-300 underline" onClick={() => window.open(`/api/runs/${runId}/files/failed`, '_blank')}>
                                    失敗リストを確認する ({result.failed_rows}件)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

Step5_Convert.getLayout = (page: React.ReactElement) => <AppShell variant="wizard">{page}</AppShell>;
