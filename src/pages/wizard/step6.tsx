import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ChevronDown, ChevronUp, Folder } from 'lucide-react';
import { useOutcome } from '@/contexts/OutcomeContext';
import { WizardLayout } from '@/components/layout/WizardLayout';

export default function Step6_Final() {
    const router = useRouter();
    const { outcome } = useOutcome();
    const runId = outcome.latestRunId || '4b221f9c-9f80-4be3-99dc-58545e6ae503';
    const [showDetails, setShowDetails] = useState(false);

    const handleDownload = (filename: string) => {
        window.open(`/api/runs/${runId}/files/${filename}`, '_blank');
    };

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <Card className="max-w-2xl w-full border border-[#282f39] bg-[#111418] shadow-none space-y-8 p-10 text-white rounded-xl">
                {/* 3B-7 Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-2xl font-bold text-white">
                        Amazonアップロード用 最終TSV
                    </h1>
                    <p className="text-[#9da8b9] text-sm">
                        このファイルをAmazonセラーセントラルにアップロードしてください。
                    </p>
                </div>

                {/* 3B-7 Main File Card (Highlight) */}
                <div className="bg-blue-600/10 border border-blue-500/50 rounded-xl p-8 text-center space-y-6">
                    <div className="flex flex-col items-center">
                        <FileText className="w-16 h-16 text-blue-500 mb-4" />
                        <h2 className="text-xl font-bold text-white">amazon_upload.tsv</h2>
                        <p className="text-blue-200/70 text-sm mt-1">推奨フォーマット / UTF-8</p>
                    </div>

                    <Button
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-900/40"
                        onClick={() => handleDownload('amazon_upload.tsv')}
                    >
                        <Download className="mr-2 h-6 w-6" /> 最終TSVを開く (これを使う)
                    </Button>
                </div>

                {/* 3B-7 Sub Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="text-[#9da8b9] hover:text-white text-sm py-2 flex items-center justify-center gap-2 border border-[#282f39] rounded transition-colors bg-[#1a2027]" onClick={() => window.open(`/api/runs/${runId}`, '_blank')}>
                        <Folder className="w-4 h-4" /> Runフォルダを開く
                    </button>
                    <button className="text-[#9da8b9] hover:text-white text-sm py-2 flex items-center justify-center gap-2 border border-[#282f39] rounded transition-colors bg-[#1a2027]" onClick={() => router.push('/dashboard')}>
                        Runs一覧へ戻る
                    </button>
                </div>

                {/* 3B-7 Details (Collapsed) */}
                <div className="border-t border-[#282f39] pt-4 w-full">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center justify-center w-full text-xs text-[#9da8b9] hover:text-white gap-2 py-2"
                    >
                        {showDetails ? '詳細を隠す' : 'その他のファイルを表示 (詳細)'}
                        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showDetails && (
                        <div className="mt-4 space-y-2 animate-in slide-in-from-top-2">
                            <div
                                onClick={() => handleDownload('amazon_convert_failed.csv')}
                                className="flex items-center justify-between p-3 bg-[#1a2027] rounded border border-[#282f39] cursor-pointer hover:bg-[#282f39] transition-colors"
                            >
                                <span className="text-sm text-gray-300">失敗一覧 (failed.csv)</span>
                                <Download className="w-4 h-4 text-[#9da8b9]" />
                            </div>
                            <div
                                onClick={() => handleDownload('run.log')}
                                className="flex items-center justify-between p-3 bg-[#1a2027] rounded border border-[#282f39] cursor-pointer hover:bg-[#282f39] transition-colors"
                            >
                                <span className="text-sm text-gray-300">実行ログ (run.log)</span>
                                <Download className="w-4 h-4 text-[#9da8b9]" />
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

Step6_Final.getLayout = (page: React.ReactElement) => <WizardLayout>{page}</WizardLayout>;
