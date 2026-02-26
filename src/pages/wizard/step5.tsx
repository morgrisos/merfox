import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { useOutcome } from '@/contexts/OutcomeContext';
import { Loader2, ArrowRight, AlertCircle, CheckCircle, FileJson, Settings2 } from 'lucide-react';
import axios from 'axios';
import { AppShell } from '@/components/layout/AppShell';

// [L2-2] Amazon listing condition options
const CONDITION_OPTIONS = [
    { value: '11', label: '中古-良 (11)' },
    { value: '10', label: '中古-非常に良い (10)' },
    { value: '9', label: '中古-可 (9)' },
];

const DEFAULT_CONFIG = {
    item_condition: '11',
    leadtime_to_ship: '2',
    item_note: '中古品です。',
};

export default function Step5_Convert() {
    const router = useRouter();
    const { outcome } = useOutcome();
    const runId = (outcome as any).latestRunId || '4b221f9c-9f80-4be3-99dc-58545e6ae503';

    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // [L2-2] Listing config state
    const [itemCondition, setItemCondition] = useState(DEFAULT_CONFIG.item_condition);
    const [leadtime, setLeadtime] = useState(DEFAULT_CONFIG.leadtime_to_ship);
    const [itemNote, setItemNote] = useState(DEFAULT_CONFIG.item_note);
    const [leadtimeError, setLeadtimeError] = useState('');

    const validateLeadtime = (val: string) => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 1 || n > 30) {
            setLeadtimeError('1〜30の整数を入力してください');
            return false;
        }
        setLeadtimeError('');
        return true;
    };

    const startConversion = async () => {
        if (status === 'running') return;

        // Validate
        if (!validateLeadtime(leadtime)) return;

        setStatus('running');
        setErrorMsg('');

        try {
            // [L2-2] Save listing_config.json BEFORE conversion
            await axios.post(`/api/runs/${runId}/listing-config`, {
                amazon: {
                    item_condition: itemCondition || DEFAULT_CONFIG.item_condition,
                    leadtime_to_ship: String(parseInt(leadtime, 10) || 2),
                    item_note: itemNote.trim() || DEFAULT_CONFIG.item_note,
                },
            });

            // Then convert
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
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-white">Amazon用TSVに変換します</h1>
                    <p className="text-app-text-muted text-sm">
                        このRunのデータとmappingを使って変換します。<br />
                        （ファイル選択は不要です）
                    </p>
                </div>

                {/* Input Visualization (Read-only) */}
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

                {/* [L2-2] Amazon Listing Settings Form — only shown when idle */}
                {status === 'idle' && (
                    <div className="w-full border border-blue-500/40 bg-blue-950/30 rounded-lg p-4 space-y-4 text-sm">
                        <div className="flex items-center gap-2 text-blue-300 font-semibold">
                            <Settings2 className="w-4 h-4 shrink-0" />
                            <span>Amazon 出品設定（このRunのTSVに反映）</span>
                        </div>

                        {/* item-condition */}
                        <div className="space-y-1">
                            <label className="block text-xs text-app-text-muted font-medium">
                                item-condition <span className="text-orange-400">*</span>
                            </label>
                            <select
                                value={itemCondition}
                                onChange={e => setItemCondition(e.target.value)}
                                className="w-full bg-app-base border border-app-border text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                {CONDITION_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* leadtime-to-ship */}
                        <div className="space-y-1">
                            <label className="block text-xs text-app-text-muted font-medium">
                                leadtime-to-ship（発送日数・日）<span className="text-orange-400">*</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={leadtime}
                                onChange={e => { setLeadtime(e.target.value); validateLeadtime(e.target.value); }}
                                className="w-full bg-app-base border border-app-border text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                            />
                            {leadtimeError && (
                                <p className="text-red-400 text-xs">{leadtimeError}</p>
                            )}
                        </div>

                        {/* item-note */}
                        <div className="space-y-1">
                            <label className="block text-xs text-app-text-muted font-medium">
                                item-note（商品説明文）
                            </label>
                            <textarea
                                rows={3}
                                value={itemNote}
                                onChange={e => setItemNote(e.target.value)}
                                className="w-full bg-app-base border border-app-border text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                                placeholder="中古品です。"
                            />
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-2 text-orange-300/80 text-xs border-t border-orange-500/20 pt-3">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <p>
                                Amazon は状態申告の不一致・発送遅延が続くと出品停止／アカウント制限の可能性があります。
                                設定値を確認してから変換してください。
                            </p>
                        </div>
                    </div>
                )}

                {/* Main CTA (State Based) */}
                <div className="w-full space-y-4">
                    {status === 'idle' && (
                        <Button
                            size="lg"
                            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg"
                            onClick={startConversion}
                        >
                            設定を保存して変換する
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
                                onClick={() => setStatus('idle')}
                            >
                                設定を変えて再試行
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

                            {/* Success CTA */}
                            <Button
                                size="lg"
                                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg"
                                onClick={() => router.push('/wizard/step6')}
                            >
                                次へ（最終TSV） <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>

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
