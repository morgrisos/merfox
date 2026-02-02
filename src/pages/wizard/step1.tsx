import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/hooks/useSettings';
import { Play, AlertCircle, Search, Link as LinkIcon } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import pkg from '../../../package.json';

type ExtractionMode = 'test' | 'production';
type InputType = 'keyword' | 'url';

export default function Step1_Setup() {
    const router = useRouter();
    const { settings, updateSettings } = useSettings();

    // UI State
    const [mode, setMode] = useState<ExtractionMode>('test');
    const [inputType, setInputType] = useState<InputType>('keyword');

    // Inputs
    const [url, setUrl] = useState('');
    const [keyword, setKeyword] = useState('');

    // Production Settings
    const [limit, setLimit] = useState(100);
    const [ngEnabled, setNgEnabled] = useState(true);
    const [ngWords, setNgWords] = useState('');

    // Error State
    const [error, setError] = useState('');

    // Load initial state from settings if available
    useEffect(() => {
        if (settings.target?.url) setUrl(settings.target.url);
        if (settings.filters?.excludeKeywords) {
            setNgWords(settings.filters.excludeKeywords.join(', '));
        }
    }, []);

    const validate = () => {
        if (mode === 'test') {
            if (!url) return 'URLを入力してください';
            if (!url.includes('mercari.com')) return 'MercariのURLである必要があります';
        } else {
            // Production
            if (inputType === 'keyword') {
                if (!keyword.trim()) return '検索キーワードを入力してください';
            } else {
                if (!url) return 'URLを入力してください';
                if (!url.includes('mercari.com')) return 'MercariのURLである必要があります';
            }
        }
        return '';
    };

    const handleStart = async () => {
        const err = validate();
        if (err) {
            setError(err);
            return;
        }

        let targetUrl = '';
        let finalLimit = 20;

        // Determine Mode & Limit
        if (mode === 'test') {
            targetUrl = url;
            finalLimit = 20; // Fixed for Test
        } else {
            // Production
            finalLimit = limit;
            if (inputType === 'keyword') {
                const safeKw = encodeURIComponent(keyword.trim());
                targetUrl = `https://jp.mercari.com/search?keyword=${safeKw}&status=on_sale`;
            } else {
                targetUrl = url;
            }
        }

        // Process NG Words (excludeKeywords)
        const finalExcludeList = ngEnabled && mode === 'production'
            ? ngWords.split(/[\n,、]+/).map(w => w.trim()).filter(Boolean)
            : [];

        await updateSettings({
            runType: mode,
            target: {
                ...settings.target,
                mode: (mode === 'production' && inputType === 'keyword') ? 'keyword' : 'url',
                url: targetUrl,
                keyword: inputType === 'keyword' ? keyword : '',
            },
            stopConditions: {
                ...settings.stopConditions,
                countLimit: finalLimit,
                useCount: true
            },
            filters: {
                ...settings.filters,
                excludeKeywords: finalExcludeList
            }
        });

        router.push('/wizard/step2');
    };



    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Card className="flex flex-col max-w-3xl w-full mx-auto bg-[#111418] border border-[#282f39] text-white p-0 shadow-xl rounded-xl overflow-hidden">

                {/* Header */}
                <div className="bg-[#1a2027]/50 p-6 border-b border-[#282f39]">
                    <h1 className="text-2xl font-bold text-white mb-2">リサーチ条件の設定</h1>
                    <p className="text-[#9da8b9] text-sm">
                        まずはテスト抽出で動作を確認し、問題なければ本番抽出を行ってください。
                    </p>
                </div>

                <div className="p-8 space-y-8">
                    {/* Mode Selection Tabs */}
                    <div className="grid grid-cols-2 gap-4 p-1 bg-[#0d1014] rounded-lg">
                        <button
                            onClick={() => setMode('test')}
                            className={`flex flex-col items-center justify-center p-4 rounded-md transition-all ${mode === 'test'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-[#9da8b9] hover:bg-[#1a2027] hover:text-white'
                                }`}
                        >
                            <span className="text-base font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">science</span> テスト抽出
                            </span>
                            <span className="text-xs opacity-80 mt-1">20件 / 設定固定</span>
                        </button>
                        <button
                            onClick={() => setMode('production')}
                            className={`flex flex-col items-center justify-center p-4 rounded-md transition-all ${mode === 'production'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'text-[#9da8b9] hover:bg-[#1a2027] hover:text-white'
                                }`}
                        >
                            <span className="text-base font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">rocket_launch</span> 本番抽出
                            </span>
                            <span className="text-xs opacity-80 mt-1">詳細設定可能</span>
                        </button>
                    </div>

                    {/* Main Input Area */}
                    <div className="space-y-6">
                        {mode === 'test' ? (
                            // Test Mode UI
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-4">
                                    <h3 className="text-blue-400 text-sm font-bold mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> テスト抽出モード
                                    </h3>
                                    <p className="text-xs text-[#9da8b9] leading-relaxed">
                                        メルカリの検索結果URLを貼り付けて、最初の20件を取得します。<br />
                                        動作確認や接続テストに最適です。
                                    </p>
                                </div>

                                <label className="block text-sm font-medium text-[#9da8b9]">対象のURL</label>
                                <div className="relative">
                                    <Input
                                        placeholder="https://jp.mercari.com/search?keyword=..."
                                        className="h-12 bg-[#0d1014] border-[#282f39]"
                                        value={url}
                                        onChange={(e) => { setUrl(e.target.value); setError(''); }}
                                    />
                                    {error && <div className="absolute right-3 top-3 text-red-500 text-xs">{error}</div>}
                                </div>
                            </div>
                        ) : (
                            // Production Mode UI
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">

                                {/* Input Type Toggle */}
                                <div className="flex items-center gap-4 text-sm mb-2">
                                    <button
                                        onClick={() => setInputType('keyword')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${inputType === 'keyword' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-transparent text-[#9da8b9] hover:text-white'}`}
                                    >
                                        <Search className="w-3.5 h-3.5" /> キーワード検索
                                    </button>
                                    <button
                                        onClick={() => setInputType('url')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${inputType === 'url' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-transparent text-[#9da8b9] hover:text-white'}`}
                                    >
                                        <LinkIcon className="w-3.5 h-3.5" /> URL貼り付け
                                    </button>
                                </div>

                                {inputType === 'keyword' ? (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-white">検索キーワード</label>
                                        <Input
                                            placeholder="例: PS5 本体, Nike スニーカー"
                                            className="h-12 bg-[#0d1014] border-[#282f39]"
                                            value={keyword}
                                            onChange={(e) => { setKeyword(e.target.value); setError(''); }}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-white">対象のURL</label>
                                        <Input
                                            placeholder="https://jp.mercari.com/search?..."
                                            className="h-12 bg-[#0d1014] border-[#282f39]"
                                            value={url}
                                            onChange={(e) => { setUrl(e.target.value); setError(''); }}
                                        />
                                    </div>
                                )}
                                {error && <div className="p-2 text-red-500 text-xs bg-red-900/10 border border-red-900/20 rounded">{error}</div>}

                                {/* Settings Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#282f39]">

                                    {/* Limit Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-[#9da8b9] flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">list</span> 取得件数
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[20, 50, 100, 200].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setLimit(val)}
                                                    className={`py-2 text-sm font-bold rounded border transition-all ${limit === val
                                                        ? 'border-green-500 bg-green-500/20 text-green-400'
                                                        : 'border-[#282f39] bg-[#0d1014] text-[#9da8b9] hover:border-[#3e4856]'
                                                        }`}
                                                >
                                                    {val}件
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* NG Words */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-[#9da8b9] flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">block</span> NGワード除外
                                            </label>
                                            <div
                                                onClick={() => setNgEnabled(!ngEnabled)}
                                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${ngEnabled ? 'bg-green-600' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${ngEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        {ngEnabled && (
                                            <textarea
                                                className="w-full h-24 bg-[#0d1014] border border-[#282f39] rounded p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500 resize-none"
                                                placeholder="除外したいワードを改行またはカンマ区切りで入力&#13;&#10;例: ジャンク, 破損, 動作未確認"
                                                value={ngWords}
                                                onChange={(e) => setNgWords(e.target.value)}
                                            />
                                        )}
                                        <p className="text-[10px] text-[#5b6675]">
                                            ※ タイトルに含まれる商品を自動的に除外します
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Start Button */}
                    <Button
                        size="lg"
                        className={`w-full h-14 text-lg font-bold shadow-xl transition-all ${mode === 'test'
                            ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                            : 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
                            }`}
                        onClick={handleStart}
                    >
                        {mode === 'test' ? 'テスト抽出を開始（20件）' : `本番抽出を開始（${limit}件）`}
                        <Play className="ml-2 h-5 w-5 fill-current" />
                    </Button>
                </div>
            </Card>

            <div className="flex justify-between items-center text-xs text-[#9da8b9] max-w-3xl w-full mt-4 px-2">
                <div className="flex gap-4">
                    {/* Version INFO */}
                    <span>v{pkg.version}</span>
                </div>
            </div>
        </div>
    );
}

Step1_Setup.getLayout = (page: React.ReactElement) => (
    <AppShell variant="wizard">
        {page}
    </AppShell>
);
