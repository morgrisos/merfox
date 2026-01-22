import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';
import { Play, AlertCircle, HelpCircle } from 'lucide-react';
import { WizardLayout } from '@/components/layout/WizardLayout';

export default function Step1_Url() {
    const router = useRouter();
    const { settings, updateSettings } = useSettings();
    const [url, setUrl] = useState(settings.target?.url || '');
    const [error, setError] = useState('');

    const validateUrl = (val: string) => {
        if (!val) return 'URLを入力してください';
        if (!val.includes('mercari.com')) return 'MercariのURLである必要があります';
        return '';
    };

    const handleStart = async () => {
        const err = validateUrl(url);
        if (err) {
            setError(err);
            return;
        }

        // 3B: Default to Test Extract (20 items)
        await updateSettings({
            target: { ...settings.target, url, mode: 'url' },
            stopConditions: {
                ...settings.stopConditions,
                countLimit: 20, // 固定: テスト抽出 (20件)
                useCount: true
            }
        });

        router.push('/wizard/step2');
    };

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Card className="flex flex-col max-w-2xl w-full mx-auto bg-[#111418] border border-[#282f39] text-white p-8 shadow-none rounded-xl">
                {/* 3B-2: 見出し / 説明 */}
                <div className="text-center space-y-3 mb-8">
                    <h1 className="text-2xl font-bold text-white">URLを入力してください</h1>
                    <p className="text-[#9da8b9] text-sm leading-relaxed">
                        メルカリの検索結果URLを貼り付けてください。<br />
                        まずはテスト抽出（20件）がおすすめです。
                    </p>
                </div>

                <div className="space-y-6">
                    {/* URL Input */}
                    <div className="relative">
                        <Input
                            placeholder="https://jp.mercari.com/search?keyword=..."
                            className={`text-base h-14 pl-4 bg-[#1a2027] border-[#282f39] text-white placeholder:text-[#9da8b9]/50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500' : ''}`}
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                setError('');
                            }}
                        />
                        {error && (
                            <div className="absolute right-4 top-4 text-red-500 flex items-center text-xs font-medium bg-[#1a2027]/80 backdrop-blur px-2 py-1 rounded">
                                <AlertCircle className="w-4 h-4 mr-1" /> {error}
                            </div>
                        )}
                    </div>

                    {/* Presets (Simplified/Optional per 3B 'Preset (Select by Purpose)') */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="border border-blue-500 bg-blue-900/20 rounded p-3 text-center cursor-pointer transition-all">
                            <div className="text-xs font-bold text-blue-400 mb-1">● 初心者おすすめ</div>
                            <div className="text-[10px] text-[#9da8b9]">テスト抽出 (20件)</div>
                        </div>
                        <div className="border border-[#282f39] bg-[#1a2027] opacity-60 rounded p-3 text-center cursor-not-allowed">
                            <div className="text-xs font-bold text-gray-500 mb-1">本気抽出</div>
                            <div className="text-[10px] text-gray-600">設定変更が必要</div>
                        </div>
                        <div className="border border-[#282f39] bg-[#1a2027] opacity-60 rounded p-3 text-center cursor-not-allowed">
                            <div className="text-xs font-bold text-gray-500 mb-1">検証用</div>
                            <div className="text-[10px] text-gray-600">設定変更が必要</div>
                        </div>
                    </div>

                    {/* 3B-2: Main CTA (Single/Bold) */}
                    <Button
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-900/20"
                        onClick={handleStart}
                        disabled={!url}
                    >
                        テスト抽出（20件）
                        <Play className="ml-2 h-5 w-5 fill-current" />
                    </Button>

                    {/* 3B-2: Sub Actions */}
                    <div className="flex justify-between items-center text-xs text-[#9da8b9] px-2 pt-2">
                        <button className="hover:text-white transition-colors flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" /> このツールの使い方（1分）
                        </button>
                        <button className="hover:text-white transition-colors">
                            Runsを開く
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

Step1_Url.getLayout = (page: React.ReactElement) => <WizardLayout>{page}</WizardLayout>;
