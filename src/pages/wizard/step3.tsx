import React from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { useOutcome } from '@/contexts/OutcomeContext';
import { AlertTriangle, ArrowRight, RefreshCw, Settings, Play } from 'lucide-react';
import { WizardLayout } from '@/components/layout/WizardLayout';

export default function Step3_Verify() {
    const router = useRouter();
    const { mode } = router.query;
    const { outcome } = useOutcome();
    const isSuccess = mode === 'success';

    // Type casting for robust latestRunId access
    const latestRunId = (outcome as any).latestRunId;

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <Card className="max-w-3xl w-full bg-[#111418] border border-[#282f39] text-white p-8 shadow-none rounded-xl">
                {/* 3B-4: Header */}
                <div className="text-center space-y-4 mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        {isSuccess ? '抽出できました' : '診断結果'}
                    </h1>
                    <p className="text-[#9da8b9] text-sm">
                        {isSuccess
                            ? '内容を確認して、マッピングへ進んでください。'
                            : '問題の原因と、次に押すボタンを表示します。'}
                    </p>
                </div>

                {/* 3B-4: Main Content (Conditional) */}
                {isSuccess ? (
                    <div className="space-y-8">
                        {/* Success Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-900/10 border border-green-800/30 p-6 rounded-lg text-center">
                                <p className="text-[#9da8b9] text-xs uppercase tracking-wider mb-2">取得成功</p>
                                <p className="text-4xl font-bold text-green-500 font-mono">{outcome.itemsCount ?? 0}<span className="text-base text-[#9da8b9] ml-1">件</span></p>
                            </div>
                            <div className="bg-[#1a2027] border border-[#282f39] p-6 rounded-lg text-center">
                                <p className="text-[#9da8b9] text-xs uppercase tracking-wider mb-2">除外/失敗</p>
                                <p className="text-4xl font-bold text-[#9da8b9] font-mono">{outcome.failedCount ?? 0}<span className="text-base text-[#9da8b9]/50 ml-1">件</span></p>
                            </div>
                        </div>

                        {/* 3B-4: Primary CTA (Success) */}
                        <Button size="lg" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg" onClick={() => router.push('/wizard/step4')}>
                            次へ（mapping確認） <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                        <div className="text-center">
                            <button className="text-xs text-[#9da8b9] hover:text-white underline" onClick={() => router.push('/dashboard')}>
                                Runsに保存して終了
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 3B-4: Diagnosis Card (Template) */}
                        <div className="border border-red-500/30 bg-red-900/10 rounded-lg p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">抽出数が 0 件でした</h3>
                                    <p className="text-sm text-[#9da8b9]">
                                        考えられる原因 Top 3:
                                    </p>
                                    <ul className="list-disc pl-5 mt-2 text-sm text-[#9da8b9] space-y-1">
                                        <li>検索条件が厳しすぎる（価格範囲、キーワード）</li>
                                        <li>メルカリ側の一時的なアクセス制限</li>
                                        <li>URLが無効</li>
                                    </ul>
                                </div>
                            </div>

                            {/* 3B-4: Failure CTA (Primary) */}
                            <Button size="lg" className="w-full text-base font-bold bg-[#282f39] hover:bg-[#343b46] text-white border border-gray-600" onClick={() => router.push('/wizard/step2')}>
                                <RefreshCw className="mr-2 h-5 w-5" /> 待機時間を延長して再実行
                            </Button>
                        </div>

                        {/* Sub Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="border-[#282f39] text-[#9da8b9] hover:bg-[#282f39] hover:text-white" onClick={() => router.push('/wizard/step1')}>
                                <Settings className="mr-2 h-4 w-4" /> 設定を緩めてテスト
                            </Button>
                            <Button variant="outline" className="border-[#282f39] text-[#9da8b9] hover:bg-[#282f39] hover:text-white" onClick={() => window.open(latestRunId ? '#' : 'https://jp.mercari.com')}>
                                <Play className="mr-2 h-4 w-4" /> ブラウザで確認
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

Step3_Verify.getLayout = (page: React.ReactElement) => <WizardLayout>{page}</WizardLayout>;
