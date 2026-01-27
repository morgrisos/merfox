import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { useOutcome } from '@/contexts/OutcomeContext';
import { FileSpreadsheet, ArrowRight, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { AppShell } from '@/components/layout/AppShell';

export default function Step4_Mapping() {
    const router = useRouter();
    const { outcome } = useOutcome();
    // Default to mock if context is missing runId
    const runId = (outcome as any).latestRunId || '4b221f9c-9f80-4be3-99dc-58545e6ae503';

    const [mappingStatus, setMappingStatus] = useState<{ status: 'none' | 'standard' | 'custom', rows?: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!runId) return;

        const checkMapping = async () => {
            try {
                // Fetch list and find our run
                const res = await axios.get('/api/runs?limit=10');
                const run = res.data.data.find((r: any) => r.id === runId);

                if (run && run.artifacts?.mapping) {
                    setMappingStatus(run.artifacts.mapping);
                } else if (run && run.artifacts?.hasMapping) {
                    // Fallback for older API partial response
                    setMappingStatus({ status: 'standard' });
                } else {
                    setMappingStatus({ status: 'none' });
                }
            } catch (e) {
                console.error("Failed to check mapping", e);
                setMappingStatus({ status: 'none' });
            } finally {
                setLoading(false);
            }
        };

        checkMapping();
    }, [runId]);

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <Card className="max-w-2xl w-full border border-app-border bg-app-surface shadow-none space-y-6 p-6 text-white rounded-lg">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-white">カテゴリーマッピング</h1>
                    <p className="text-app-text-muted text-sm">メルカリのカテゴリーをAmazonのASINコードに関連付けます。</p>
                </div>

                <div className="grid gap-6">
                    {/* Status Card */}
                    <Card className="border border-app-border bg-app-element shadow-sm rounded-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 py-4 px-6">
                            <CardTitle className="text-base font-medium text-white">
                                mapping.csv ステータス
                            </CardTitle>
                            {loading ? <RefreshCw className="animate-spin h-4 w-4 text-app-text-muted" /> :
                                mappingStatus?.status === 'custom' ? <FileSpreadsheet className="text-green-500 h-5 w-5" /> :
                                    mappingStatus?.status === 'standard' ? <FileSpreadsheet className="text-blue-500 h-5 w-5" /> :
                                        <FileSpreadsheet className="text-gray-500 h-5 w-5" />}
                        </CardHeader>
                        <CardContent className="px-6 pb-4">
                            {loading ? (
                                <p className="text-app-text-muted text-sm">確認中...</p>
                            ) : mappingStatus?.status === 'custom' ? (
                                <div className="space-y-1">
                                    <p className="text-green-500 font-bold flex items-center text-sm">
                                        カスタムマッピング中
                                    </p>
                                    <p className="text-xs text-app-text-muted">
                                        {mappingStatus.rows ? `${mappingStatus.rows} カテゴリが登録済みです。` : 'カスタム設定が検出されました。'}
                                        専用の変換ルールが適用されます。
                                    </p>
                                </div>
                            ) : mappingStatus?.status === 'standard' ? (
                                <div className="space-y-1">
                                    <p className="text-blue-500 font-bold flex items-center text-sm">
                                        標準Amazonマッピングを使用
                                    </p>
                                    <p className="text-xs text-app-text-muted">
                                        デフォルトのテンプレートが適用されます。自動変換を実行します。
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-yellow-900/10 border border-yellow-900/30 p-3 rounded text-xs text-yellow-200">
                                        マッピングファイル未検出 (None)
                                    </div>
                                    <p className="text-xs text-app-text-muted">
                                        システムは自動的に標準テンプレートを生成するか、グローバル設定を使用します。
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Button
                        size="lg"
                        className="w-full text-base h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-none font-bold"
                        onClick={() => router.push('/wizard/step5')}
                    >
                        次へ：Amazon TSVへ変換 <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}

Step4_Mapping.getLayout = (page: React.ReactElement) => <AppShell variant="wizard">{page}</AppShell>;
