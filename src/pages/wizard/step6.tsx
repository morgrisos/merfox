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
    const [failureInfo, setFailureInfo] = useState({ reason: '', detail: '' });

    useEffect(() => {
        if (!runId) return;
        fetch(`/api/runs/${runId}/preview`)
            .then(res => res.json())
            .then(data => {
                setExists(data.exists);
                setPreview(data.preview || []);
                setFailureInfo({ reason: data.reason || '', detail: data.detail || '' });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [runId]);

    const handleDownload = async (type: string) => {
        if (!runId) return;
        try {
            const response = await fetch(`/api/runs/${runId}/files/${type}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Safe filename: prevent double extension
            const filename = type.includes('.') ? type : `${type}.csv`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            alert(`ダウンロードに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
        }
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
                failureInfo.reason === 'CONVERT_FAILED' || failureInfo.reason === 'MAPPING_MISSING' ? (
                    <Card className="w-full bg-blue-900/20 border border-blue-500/50 p-8 text-center rounded-xl space-y-6">
                        <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-3xl">📋</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">変換できませんでした（マッピングが未設定です）</h2>
                            <p className="text-blue-100/80 text-sm leading-relaxed">
                                ASIN/JANが未登録のため、Amazon用TSVを作れません。<br />
                                マッピングを設定すると次回から成功します。
                            </p>
                        </div>

                        {failureInfo.detail && (
                            <div className="text-blue-200/70 bg-blue-900/30 p-3 rounded text-xs border border-blue-500/30">
                                詳細: {failureInfo.detail}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button
                                size="lg"
                                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white"
                                onClick={() => router.push(`/mapping${runId ? `?runId=${runId}` : ''}`)}
                            >
                                マッピングを設定する
                            </Button>
                            <div className="flex gap-3">
                                {failureInfo.reason === 'CONVERT_FAILED' && (
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => handleDownload('failed')}
                                    >
                                        失敗リストをダウンロード
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => router.push('/dashboard')}
                                >
                                    終了
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="w-full bg-red-500/10 border border-red-500/50 p-8 text-center rounded-xl space-y-4">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                        <h2 className="text-xl font-bold text-white">TSV生成に失敗しました</h2>
                        <div className="text-red-200 bg-red-900/30 p-4 rounded border border-red-500/30">
                            <p className="font-bold mb-2">原因: {failureInfo.reason || '不明なエラー'}</p>
                            <p className="text-sm">
                                {failureInfo.reason === 'RAW_EMPTY' && '抽出された商品が0件です。検索結果ページを確認してください。'}
                                {failureInfo.reason === 'UNKNOWN' && 'ログやマッピング設定を確認してください。'}
                                {failureInfo.detail}
                            </p>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                            <Button variant="outline" onClick={() => router.push('/mapping')}>マッピング設定を開く</Button>
                            <Button variant="outline" onClick={() => router.push('/dashboard')}>終了</Button>
                        </div>
                    </Card>
                )
            ) : (
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
