import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Eye, Plus, RefreshCw, Copy, ExternalLink, Check, Upload, CheckCircle2, Download } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

export default function InventoryMonitoring() {
    const { query } = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<{ checked: number; skipped: number; failed: number } | null>(null);
    
    // Add Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ amazon_asin: '', amazon_title: '', mercari_url: '' });
    const [asinInput, setAsinInput] = useState(''); // raw input: URL or ASIN
    const [asinExtractError, setAsinExtractError] = useState('');
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    const parseAsinFromInput = (raw: string): string | null => {
        const trimmed = raw.trim();
        // Already a 10-char ASIN
        if (/^[A-Z0-9]{10}$/.test(trimmed)) return trimmed;
        // Extract from URL: /dp/BXXXXXXXX or /gp/product/BXXXXXXXX
        const m = trimmed.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (m) return m[1].toUpperCase();
        return null;
    };

    const handleAsinInputChange = (raw: string) => {
        setAsinInput(raw);
        setAsinExtractError('');
        const asin = parseAsinFromInput(raw);
        if (asin) {
            setAddForm(prev => ({ ...prev, amazon_asin: asin }));
        } else if (raw.trim().length > 0 && raw.includes('amazon')) {
            setAsinExtractError('ASINを抽出できませんでした。URLを確認してください');
            setAddForm(prev => ({ ...prev, amazon_asin: '' }));
        } else {
            setAddForm(prev => ({ ...prev, amazon_asin: raw.trim().toUpperCase() }));
        }
    };

    // CSV Upload Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Copy UI state
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filter state
    type FilterType = 'all' | 'danger' | 'warning' | 'unhandled' | 'pending';
    const [filter, setFilter] = useState<FilterType>('all');

    // Sync filter from URL query (?filter=alerts → unhandled)
    useEffect(() => {
        if (query.filter === 'alerts') setFilter('unhandled');
    }, [query.filter]);

    const fetchItems = async () => {
        try {
            const res = await apiFetch('/api/inventory/items');
            if (res.status === 403) return; // License not active — LicenseGate handles UI
            if (!res.ok) return;
            const data = await res.json();
            if (!Array.isArray(data)) return; // Guard: reject non-array responses
            // Guard: skip setState if content is identical (avoid spurious re-renders)
            setItems(prev => {
                if (prev.length === data.length &&
                    JSON.stringify(prev.map(i => i.watch_id ?? i.id)) ===
                    JSON.stringify(data.map((i: any) => i.watch_id ?? i.id))) {
                    return prev; // No change — return same reference
                }
                return data;
            });
        } catch (e) {
            console.error('Failed to fetch items', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleCheckAll = async () => {
        if (checking) return;
        const payload = { force: true };
        console.log('[INV_BUTTON_CLICK]', new Date().toISOString());
        console.log('[INV_REQUEST_PAYLOAD]', JSON.stringify(payload));
        setChecking(true);
        try {
            const res = await apiFetch('/api/inventory/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            console.log('[INV_RESPONSE_JSON]', JSON.stringify(data));
            if (res.ok) {
                setCheckResult({
                    checked: data.checked_count ?? 0,
                    skipped: data.skipped_count ?? 0,
                    failed: data.failed_count ?? 0
                });
                if (Array.isArray(data.results) && data.results.length > 0) {
                    setItems(prev => {
                        const updatedMap = new Map(data.results.map((r: any) => [r.watch_id, r]));
                        return prev.map(i => updatedMap.has(i.watch_id) ? updatedMap.get(i.watch_id) : i);
                    });
                } else {
                    await fetchItems();
                }
            } else {
                alert(`チェックに失敗しました: ${data.error || res.status}`);
            }
        } catch (e: any) {
            console.error('[INV_FETCH_ERROR]', e.message || e);
            alert('チェックエラー: ' + (e.message || '不明なエラー'));
        } finally {
            setChecking(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.amazon_asin) {
            setAddError('ASINを入力してください');
            return;
        }
        setAddError('');
        setAddLoading(true);

        try {
            const res = await apiFetch('/api/inventory/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...addForm, amazon_sku: addForm.amazon_asin })
            });
            const data = await res.json();
            
            if (!res.ok) {
                setAddError(data.error || '追加に失敗しました');
            } else {
                setShowAddModal(false);
                setAddForm({ amazon_asin: '', amazon_title: '', mercari_url: '' });
                setAsinInput('');
                setAsinExtractError('');
                fetchItems();
            }
        } catch (e: any) {
            setAddError(e.message || 'エラーが発生しました');
        } finally {
            setAddLoading(false);
        }
    };

    const openExternal = (url: string) => {
        try {
            (window as any).merfox?.openExternal?.(url);
        } catch {
            console.warn('[OPEN_EXTERNAL_FAIL]', url);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string;
            setChecking(true);
            try {
                const res = await apiFetch('/api/inventory/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ csvText: text })
                });
                const data = await res.json();
                if (res.ok) {
                    alert(`${data.added}件を追加し、${data.skipped}件の重複をスキップしました。`);
                    fetchItems();
                } else {
                    alert(`インポートに失敗しました: ${data.error}`);
                }
            } catch (err) {
                console.error(err);
                alert('通信エラーが発生しました');
            } finally {
                setChecking(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleExportCSV = () => {
        console.log('[WATCH_EXPORT_START] count=', items.length);

        const escapeCell = (v: string | null | undefined): string => {
            const s = v == null ? '' : String(v);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };

        const header = ['SKU', 'ASIN', 'mercari_url', 'title'].join(',');
        const rows = items.map(item =>
            [
                escapeCell(item.amazon_sku),
                escapeCell(item.amazon_asin),
                escapeCell(item.mercari_url),
                escapeCell(item.amazon_title),
            ].join(',')
        );

        if (items.length === 0) {
            console.log('[WATCH_EXPORT_EMPTY] Exporting header-only CSV');
        }

        const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const fileName = `merfox_watch_items_backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        console.log('[WATCH_EXPORT_DONE] file=', fileName, 'rows=', items.length);
    };

    const handleMarkAsHandled = async (watch_id: string) => {
        console.log('[INV_MARK_RESOLVED]', watch_id);
        try {
            const res = await apiFetch(`/api/inventory/${watch_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_level: 'normal', alert_reason: 'resolved', is_resolved: true })
            });
            if (res.ok) {
                // Optimistic update: reflect resolved state immediately without full refetch
                setItems(prev => prev.map(i => i.watch_id === watch_id
                    ? { ...i, alert_level: 'normal', alert_reason: 'resolved', is_resolved: true }
                    : i
                ));
            } else {
                alert('更新に失敗しました');
            }
        } catch (e) {
            console.error(e);
            alert('通信エラーが発生しました');
        }
    };

    const handleCopyMemo = (item: any) => {
        const text = `SKU: ${item.amazon_sku} / ASIN: ${item.amazon_asin} / 理由: ${item.alert_reason}`;
        navigator.clipboard.writeText(text);
        setCopiedId(item.watch_id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const dangerCount = items.filter(i => i.alert_level === 'danger').length;
    const warningCount = items.filter(i => i.alert_level === 'warning').length;
    const normalCount = items.filter(i => i.alert_level === 'normal').length;
    const pendingCount = items.filter(i => !i.last_checked_at).length;

    const activeItems = items.filter(i => i.last_known_status === 'active' || (i.last_known_status === 'unknown' && i.alert_level === 'normal'));
    const totalAmazonPrice = activeItems.reduce((sum, i) => sum + (i.amazon_listing_price || 0), 0);
    const totalMercariPrice = activeItems.reduce((sum, i) => sum + (i.mercari_price || 0), 0);
    const totalDiff = totalAmazonPrice - totalMercariPrice;

    // Filter Logic
    const filteredItems = items.filter(i => {
        if (filter === 'all') return true;
        if (filter === 'danger') return i.alert_level === 'danger' && !i.is_resolved;
        if (filter === 'warning') return i.alert_level === 'warning' && !i.is_resolved;
        if (filter === 'unhandled') return (i.alert_level === 'danger' || i.alert_level === 'warning') && !i.is_resolved;
        if (filter === 'pending') return !i.last_checked_at;
        return true;
    });


    const getStatusLabel = (status: string, lastCheckedAt: string | null): string => {
        if (!lastCheckedAt) return '初回待ち';
        switch (status) {
            case 'active': return '出品中';
            case 'sold': return '売り切れ';
            case 'deleted': return '削除';
            case 'blocked': return 'ブロック';
            case 'failed': return '通信失敗';
            case 'unknown': return '確認不可';
            default: return '確認不可';
        }
    };

    const getStatusColor = (status: string, lastCheckedAt: string | null): string => {
        if (!lastCheckedAt) return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400 border border-green-500/30';
            case 'sold':
            case 'deleted': return 'bg-red-500/20 text-red-400 border border-red-500/30';
            case 'blocked': return 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30';
            case 'failed': return 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
        }
    };

    const getReasonLabel = (reason: string): string => {
        const labels: Record<string, string> = {
            'none': '',
            'sold_out': '売り切れ',
            'sold_detected': '売り切れ検出',
            'deleted': '削除済み',
            'deleted_404': '削除済み',
            'blocked_browser_old': 'アクセス制限',
            'blocked_access_denied': 'アクセス拒否',
            'blocked_skeleton': 'ページ読み込み失敗',
            'blocked_generic': '表示エラー',
            'unknown_no_title': '情報取得失敗',
            'unknown_skeleton': '読み込み不完全',
            'unknown_incomplete_dom': '表示不完全',
            'price_changed': '価格変動',
            'fetch_failed': '取得失敗',
            'failed_timeout': 'タイムアウト',
            'check_failed': 'チェック失敗',
            'resolved': '対応済み',
        };
        return labels[reason] ?? '';
    };

    const getSortWeight = (item: any): number => {
        if (item.alert_level === 'danger') return 4;
        if (item.alert_level === 'warning') return 3;
        if (!item.last_checked_at) return 2; // 初回待ち
        return 1;
    };

    const formatCheckedAt = (dt: string | null): string => {
        if (!dt) return '—';
        const d = new Date(dt);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'たった今';
        if (diffMin < 60) return `${diffMin}分前`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}時間前`;
        return `${Math.floor(diffH / 24)}日前`;
    };

    const formatPrice = (price: number | null): string => {
        if (price == null) return '—';
        return `¥${price.toLocaleString()}`;
    };

    const FilterButton = ({ type, label, count }: { type: FilterType, label: string, count?: number }) => (
        <button
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors border ${
                filter === type
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-app-element border-app-border text-app-text-muted hover:bg-app-surface hover:text-white'
            }`}
        >
            {label} {count !== undefined && <span className="ml-1 opacity-70 border-l border-white/20 pl-1">{count}</span>}
        </button>
    );

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white relative">
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">

                {/* Header */}
                <PageHeader
                    icon={<Eye className="w-6 h-6" />}
                    title={<span className="flex items-center gap-2">在庫監視<span className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">A版</span></span>}
                    description="仕入れ元（メルカリ）の売り切れ・削除・価格変動を検知します。自分のAmazon出品価格の動的監視は行いません。"
                    actions={
                        <button
                            onClick={handleCheckAll}
                            disabled={checking || items.length === 0}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-lg shadow-blue-500/20"
                        >
                            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                            {checking ? `チェック中 (${items.length}件)...` : '状態をチェック'}
                        </button>
                    }
                />

                {/* Check Result Banner */}
                {checkResult && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-blue-300 font-bold">チェック完了:</span>
                            <span className="text-white">{checkResult.checked}件確認</span>
                            {checkResult.skipped > 0 && (
                                <span className="text-app-text-muted">/ 売り切れ済み {checkResult.skipped}件をスキップ</span>
                            )}
                            {checkResult.failed > 0 && (
                                <span className="text-yellow-400">/ {checkResult.failed}件失敗</span>
                            )}
                        </div>
                        <button onClick={() => setCheckResult(null)} className="text-app-text-muted hover:text-white text-xs">✕</button>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">監視中</p>
                        <p className="text-3xl font-black text-white">{items.length}</p>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">正常 / 注意 / 危険</p>
                        <p className="text-xl font-black">
                            <span className="text-green-400">{normalCount}</span>
                            <span className="text-app-text-muted mx-1">/</span>
                            <span className="text-yellow-400">{warningCount}</span>
                            <span className="text-app-text-muted mx-1">/</span>
                            <span className="text-red-500">{dangerCount}</span>
                        </p>
                    </div>
                    {totalAmazonPrice > 0 && (
                        <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm col-span-2">
                            <p className="text-xs text-app-text-muted font-bold uppercase mb-2">出品中 価格合計（出品 / 仕入 / 差額）</p>
                            <p className="text-sm font-bold">
                                <span className="text-white">Amazon ¥{totalAmazonPrice.toLocaleString()}</span>
                                <span className="text-app-text-muted mx-2">/</span>
                                <span className="text-app-text-muted">メルカリ ¥{totalMercariPrice.toLocaleString()}</span>
                                <span className="text-app-text-muted mx-2">/</span>
                                <span className={totalDiff >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    差額 {totalDiff >= 0 ? '+' : ''}¥{totalDiff.toLocaleString()}
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Status Legend + Manual-Stop Notice */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                        <p className="text-xs font-bold text-amber-400 uppercase mb-2">⚠️ ステータスの見方</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span><span className="text-gray-300">緑 — 出品中（安全）</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span><span className="text-gray-300">赤 — 売り切れ / 削除（停止推奨）</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fuchsia-400 inline-block"></span><span className="text-gray-300">紫 — ブロック（再チェック推奨）</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span><span className="text-gray-300">黄 — 通信失敗（再試行）</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span><span className="text-gray-300">灰 — 不明（目視確認推奨）</span></span>
                        </div>
                    </div>
                    <div className="shrink-0 border-l border-amber-500/20 pl-4">
                        <p className="text-xs font-bold text-amber-400">🔴 自動停止はしません</p>
                        <p className="text-xs text-gray-400 mt-0.5">危険商品は手動でAmazonを停止してください</p>
                    </div>
                </div>

                {/* Filters + CSV toolbar */}
                {items.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2 flex-wrap">
                                <FilterButton type="all" label="すべて" count={items.length} />
                                <FilterButton type="unhandled" label="未対応" count={dangerCount + warningCount} />
                                <FilterButton type="danger" label="危険" count={dangerCount} />
                                <FilterButton type="warning" label="注意" count={warningCount} />
                                {pendingCount > 0 && <FilterButton type="pending" label="初回待ち" count={pendingCount} />}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportCSV}
                                    title="このCSVは一括登録からそのまま復元できます"
                                    className="px-3 py-2 bg-app-element hover:bg-app-surface border border-app-border text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors text-xs"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    CSVでバックアップ
                                </button>
                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={checking}
                                    className="px-3 py-2 bg-app-element hover:bg-app-surface border border-app-border text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors text-xs"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    CSV一括登録
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-3 py-2 bg-app-element hover:bg-app-surface border border-app-border text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    手動追加
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] text-app-text-muted mt-1 text-right">※バックアップCSVはそのまま一括登録で復元できます</p>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="py-12 text-center text-app-text-muted">読み込み中...</div>
                ) : items.length === 0 ? (
                    <div className="bg-app-surface border-2 border-dashed border-app-border rounded-xl p-12 text-center">
                        <div className="w-20 h-20 bg-app-element rounded-full flex items-center justify-center mx-auto mb-4">
                            <Eye className="w-10 h-10 text-app-text-muted" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">まだ監視中の商品がありません</h3>
                        <p className="text-app-text-muted mb-6 max-w-lg mx-auto">
                            Amazonに出品中の商品と仕入れ元のメルカリURLを登録して監視を始めましょう
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20"
                        >
                            <Upload className="w-4 h-4 inline mr-2" />
                            CSVファイルをアップロード
                        </button>
                    </div>
                ) : (
                    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-app-border bg-app-element/30">
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase">商品情報</th>
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase">メルカリ状態</th>
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase">出品価格 / 仕入価格<span className="text-[9px] font-normal ml-1 opacity-60">（登録時）</span></th>
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase">現在価格 / 確認時刻</th>
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase text-right">アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-app-text-muted text-sm">該当する商品がありません</td>
                                    </tr>
                                ) : (
                                    [...filteredItems].sort((a, b) => getSortWeight(b) - getSortWeight(a)).map(item => {
                                        const label = getStatusLabel(item.last_known_status, item.last_checked_at);
                                        const colorClass = getStatusColor(item.last_known_status, item.last_checked_at);
                                        const reasonText = getReasonLabel(item.alert_reason);

                                        return (
                                            <tr key={item.watch_id} className="border-b border-app-border/50 hover:bg-app-element/10 transition-colors">
                                                <td className="p-4 max-w-sm">
                                                    <p className="font-bold text-sm truncate" title={item.amazon_title}>{item.amazon_title}</p>
                                                    <div className="flex gap-3 mt-1 text-xs text-app-text-muted">
                                                        <span>SKU: {item.amazon_sku}</span>
                                                        <span>ASIN: {item.amazon_asin}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${colorClass}`}>
                                                            {label}
                                                        </span>
                                                        {reasonText && (
                                                            <span className="text-xs text-app-text-muted">{reasonText}</span>
                                                        )}
                                                    </div>
                                                    <button onClick={() => openExternal(item.mercari_url)} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                                        メルカリで確認 <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                </td>
                                                <td className="p-4 min-w-[160px]">
                                                    {item.amazon_listing_price ? (
                                                        <div className="space-y-0.5">
                                                            <div>
                                                                <p className="text-[9px] text-app-text-muted uppercase font-bold tracking-wide">Amazon価格（登録時）</p>
                                                                <p className="text-sm font-bold text-white">{formatPrice(item.amazon_listing_price)}</p>
                                                            </div>
                                                            {item.mercari_price ? (
                                                                <div>
                                                                    <p className="text-[9px] text-app-text-muted uppercase font-bold tracking-wide">メルカリ価格（登録時）</p>
                                                                    <p className="text-xs text-app-text-muted">{formatPrice(item.mercari_price)}</p>
                                                                </div>
                                                            ) : null}
                                                            {item.amazon_listing_price && item.mercari_price ? (
                                                                <p className={`text-xs font-bold ${item.amazon_listing_price - item.mercari_price >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                    差額 {item.amazon_listing_price - item.mercari_price >= 0 ? '+' : ''}¥{(item.amazon_listing_price - item.mercari_price).toLocaleString()}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-app-text-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {(() => {
                                                        const curr: number | null = item.last_known_price ?? null;
                                                        const prev: number | null = item.previous_known_price ?? null;
                                                        const diff = curr != null && prev != null ? curr - prev : null;
                                                        const priceColor = diff == null || diff === 0
                                                            ? 'text-gray-400'
                                                            : diff < 0 ? 'text-green-400' : 'text-red-400';
                                                        return (
                                                            <div>
                                                                <p className="text-[9px] text-app-text-muted uppercase font-bold tracking-wide">現在価格</p>
                                                                {curr != null
                                                                    ? <p className={`text-sm font-bold ${priceColor}`}>{formatPrice(curr)}</p>
                                                                    : <p className="text-xs text-app-text-muted">—</p>
                                                                }
                                                                {diff != null && (
                                                                    <p className={`text-xs font-bold ${priceColor}`}>
                                                                        {diff === 0 ? '±¥0' : `${diff > 0 ? '+' : ''}¥${Math.abs(diff).toLocaleString()}`}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                    <p className="text-xs text-app-text-muted mt-1">{formatCheckedAt(item.last_checked_at)}</p>
                                                </td>
                                                <td className="p-4 flex flex-col items-end gap-2">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openExternal(`https://sellercentral.amazon.co.jp/inventory/ref=xx_invmgr_dnav_xx?tbla_myitable=search:${item.amazon_sku}`)}
                                                            className="text-xs bg-app-element border border-app-border hover:bg-app-border px-3 py-1.5 rounded inline-flex items-center gap-1 justify-center transition-colors shadow-sm"
                                                        >
                                                            Amazonで確認 <ExternalLink className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCopyMemo(item)}
                                                            className="text-xs bg-app-element border border-app-border hover:bg-app-border px-3 py-1.5 rounded inline-flex items-center justify-center gap-1 transition-colors shadow-sm"
                                                            title="ASINをコピー"
                                                        >
                                                            {copiedId === item.watch_id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-app-text-muted" />}
                                                            ASINコピー
                                                        </button>
                                                    </div>
                                                    {['danger', 'warning'].includes(item.alert_level) && (
                                                        <button
                                                            onClick={() => handleMarkAsHandled(item.watch_id)}
                                                            className="text-xs bg-green-600/20 text-green-400 hover:bg-green-600/40 border border-green-500/30 px-3 py-1.5 rounded flex items-center gap-1 transition-colors w-full justify-center"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            対応済みにする
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-app-surface border border-app-border rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">手動で監視商品を追加</h2>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted mb-1">
                                    Amazon ASIN または Amazon URL <span className="text-red-400">*</span>
                                </label>
                                <input
                                    value={asinInput}
                                    onChange={e => handleAsinInputChange(e.target.value)}
                                    className={`w-full bg-app-base border rounded-lg px-3 py-2 text-sm ${asinExtractError ? 'border-red-500/50' : addForm.amazon_asin ? 'border-green-500/50' : 'border-app-border'}`}
                                    placeholder="B0XXXXXXXXX または https://www.amazon.co.jp/dp/B0XXXXXXXXX"
                                />
                                {addForm.amazon_asin && (
                                    <p className="text-[10px] text-green-400 mt-1">✓ ASIN: {addForm.amazon_asin}</p>
                                )}
                                {asinExtractError && (
                                    <p className="text-[10px] text-red-400 mt-1">{asinExtractError}</p>
                                )}
                                <input type="hidden" required value={addForm.amazon_asin} onChange={() => {}} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted mb-1">商品名 <span className="text-red-400">*</span></label>
                                <input required value={addForm.amazon_title} onChange={e => setAddForm({...addForm, amazon_title: e.target.value})} className="w-full bg-app-base border border-app-border rounded-lg px-3 py-2 text-sm" placeholder="商品のタイトル" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted mb-1">仕入れ元 メルカリURL <span className="text-red-400">*</span></label>
                                <input required value={addForm.mercari_url} onChange={e => setAddForm({...addForm, mercari_url: e.target.value})} className="w-full bg-app-base border border-app-border rounded-lg px-3 py-2 text-sm" placeholder="https://jp.mercari.com/item/m123456789" />
                            </div>
                            
                            {addError && <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{addError}</div>}
                            
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-app-border">
                                <button type="button" onClick={() => { setShowAddModal(false); setAsinInput(''); setAsinExtractError(''); setAddForm({ amazon_asin: '', amazon_title: '', mercari_url: '' }); }} className="px-4 py-2 text-sm font-bold text-app-text-muted hover:text-white">
                                    キャンセル
                                </button>
                                <button type="submit" disabled={addLoading} className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
                                    {addLoading ? '追加中...' : '追加する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

InventoryMonitoring.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;

