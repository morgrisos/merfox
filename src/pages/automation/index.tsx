import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import Link from 'next/link';

import { Save, Clock, Power, Link as LinkIcon, CheckCircle, AlertTriangle, Activity } from 'lucide-react';

type AutomationConfig = {
    enabled: boolean;
    schedule: { kind: 'daily'; hour: number; minute: number };
    targetUrl: string;
};

export default function Automation() {
    const [config, setConfig] = useState<AutomationConfig>({
        enabled: false,
        schedule: { kind: 'daily', hour: 9, minute: 0 },
        targetUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetch('/api/automation')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load config', err);
                setLoading(false);
            });
    }, []);

    const handleChange = (key: keyof AutomationConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        setStatus('idle');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setStatus('success');
                // Re-fetch to confirm
                const data = await res.json();
                if (data.config) setConfig(data.config);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-app-text-muted">読み込み中...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black leading-tight tracking-tight text-white">自動化設定</h1>
                    <p className="text-app-text-muted text-sm mt-2">
                        毎日の自動スクレイピングを設定します。
                    </p>
                </div>
                <Link href="/scraper" className="flex items-center gap-2 px-4 py-2 bg-app-element hover:bg-app-border border border-app-border rounded-lg text-sm font-bold text-white transition-colors">
                    <Activity className="w-4 h-4 text-orange-500" /> ステータスを見る
                </Link>
            </header>

            <div className="max-w-3xl space-y-6">
                {/* 1. Main Toggle */}
                <div className={`p-6 rounded-xl border transition-colors ${config.enabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-app-surface border-app-border'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${config.enabled ? 'bg-blue-500 text-white' : 'bg-app-element text-app-text-muted'}`}>
                                <Power className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">自動実行</h3>
                                <p className="text-sm text-app-text-muted">{config.enabled ? '毎日指定時刻に実行します' : '無効化されています'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleChange('enabled', !config.enabled)}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-app-border'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* 2. Schedule (Fixed for MVP) */}
                <div className="bg-app-surface rounded-xl border border-app-border p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-app-text-muted" /> スケジュール
                    </h3>
                    <div className="flex items-center gap-4 p-4 bg-app-element rounded-lg border border-app-border">
                        <span className="text-sm text-app-text-muted">頻度:</span>
                        <span className="font-bold text-white">毎日</span>
                        <span className="text-app-border">|</span>
                        <span className="text-sm text-app-text-muted">時刻:</span>
                        <span className="font-bold text-white">09:00</span>
                        <span className="ml-auto text-xs text-app-text-muted bg-app-base px-2 py-1 rounded">固定 (MVP)</span>
                    </div>
                </div>

                {/* 3. Target URL */}
                <div className="bg-app-surface rounded-xl border border-app-border p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-app-text-muted" /> 監視対象URL
                    </h3>
                    <div className="space-y-2">
                        <label className="text-xs text-app-text-muted">メルカリ検索結果のURLを入力してください</label>
                        <input
                            type="text"
                            value={config.targetUrl}
                            onChange={(e) => handleChange('targetUrl', e.target.value)}
                            placeholder="https://jp.mercari.com/search?..."
                            className="w-full bg-app-base border border-app-border rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* 4. Save Action */}
                <div className="flex items-center justify-end gap-4 pt-4">
                    {status === 'success' && (
                        <div className="flex items-center gap-2 text-green-500 text-sm font-bold animate-pulse">
                            <CheckCircle className="w-4 h-4" /> 保存しました
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-500 text-sm font-bold">
                            <AlertTriangle className="w-4 h-4" /> エラーが発生しました
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                    >
                        {saving ? '保存中...' : (
                            <>
                                <Save className="w-4 h-4" /> 設定を保存
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

Automation.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
