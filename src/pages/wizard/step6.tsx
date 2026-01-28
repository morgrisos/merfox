import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Folder, AlertTriangle, Eye } from 'lucide-react';
import { useOutcome } from '@/contexts/OutcomeContext';
import { AppShell } from '@/components/layout/AppShell';
import { LicenseGate } from '@/components/license/LicenseGate';

export default function Step6_Final() {
    const router = useRouter();
    const { outcome } = useOutcome();
    const runId = outcome.latestRunId; // || 'latest'
    const [preview, setPreview] = useState<string[]>([]);
    const [exists, setExists] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!runId) return;
        fetch(`/api/runs/${runId}/preview`)
            .then(res => res.json())
            .then(data => {
                setExists(data.exists);
                setPreview(data.preview || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [runId]);

    const handleDownload = (type: string) => {
        if (!runId) return;
        window.open(`/api/runs/${runId}/files/${type}`, '_blank');
    };

    const handleOpenFolder = async () => {
        if (!runId) return;
        await fetch(`/api/runs/${runId}/reveal`, { method: 'POST' });
    };

    if (!runId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <p>Run ID not found. Process might have failed.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-6 w-full max-w-4xl mx-auto px-4">
            <h1 className="text-2xl font-bold text-white mb-6">Amazonアップロード</h1>

            {loading ? (
                <div className="text-app-text-muted">Loading preview...</div>
            ) : !exists ? (
                /* [REQ 2] Error State */
                <Card className="w-full bg-red-500/10 border border-red-500/50 p-8 text-center rounded-xl space-y-4">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-white">TSV生成に失敗、または有効なデータがありません</h2>
                    <p className="text-red-200">
                        「マッピング不足」あるいは「除外フィルタ」により、出力できる商品が0件でした。<br />
                        <span className="font-bold underline cursor-pointer" onClick={() => handleDownload('failed')}>
                            失敗リスト(failed.csv)を確認
                        </span>
                        してください。
                    </p>
                    <div className="flex justify-center gap-4 mt-4">
                        <Button variant="outline" onClick={() => router.push('/scraper/mapping?auto=true')}>マッピング設定を開く</Button>
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>終了</Button>
                    </div>
                </Card>
            ) : (
                /* Success State */
                <div className="w-full space-y-6">
                    <Card className="bg-app-surface border border-app-border p-8 text-center rounded-xl space-y-6">
                        <div className="flex flex-col items-center">
                            <FileText className="w-16 h-16 text-green-500 mb-4" />
                            <h2 className="text-xl font-bold text-white">amazon_upload.tsv</h2>
                            <p className="text-green-200/70 text-sm">出力完了 / {preview.length > 0 ? preview.length - 1 : 0} Items</p>
                        </div>
                        <Button
                            size="lg"
                            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-lg"
                            onClick={() => handleDownload('amazon')}
                        >
                            <Download className="mr-2 h-6 w-6" /> 最終TSVをダウンロード
                        </Button>
                    </Card>

                    {/* [REQ 3] Preview Table */}
                    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-[#1a2027] border-b border-app-border flex items-center gap-2">
                            <Eye className="w-4 h-4 text-app-text-muted" />
                            <span className="text-xs font-bold text-white">プレビュー (先頭5行)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-app-text-muted">
                                <thead>
                                    <tr className="border-b border-app-border">
                                        {preview[0]?.split('\t').map((h, i) => (
                                            <th key={i} className="px-2 py-2 font-mono whitespace-nowrap bg-app-element">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(1).map((row, rI) => (
                                        <tr key={rI} className="border-b border-app-border">
                                            {row.split('\t').map((c, cI) => (
                                                <td key={cI} className="px-2 py-2 whitespace-nowrap overflow-hidden max-w-[150px] truncate">{c}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button onClick={handleOpenFolder} className="text-app-text-muted hover:text-white text-sm flex gap-2 items-center">
                            <Folder className="w-4 h-4" /> フォルダを開く
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

Step6_Final.getLayout = (page: React.ReactElement) => (
    <AppShell variant="wizard">
        <LicenseGate>{page}</LicenseGate>
    </AppShell>
);
