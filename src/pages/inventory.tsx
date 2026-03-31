import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Eye, Plus, RefreshCw, Copy, ExternalLink, Check } from 'lucide-react';

export default function InventoryMonitoring() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    
    // Add Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ amazon_sku: '', amazon_asin: '', amazon_title: '', mercari_url: '' });
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // Copy UI state
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/inventory/items');
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
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
        setChecking(true);
        try {
            const res = await fetch('/api/inventory/check', { method: 'POST' });
            if (res.ok) {
                await fetchItems();
            } else {
                alert('チェックに失敗しました');
            }
        } catch (e) {
            console.error(e);
            alert('チェックエラー');
        } finally {
            setChecking(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        setAddLoading(true);

        try {
            const res = await fetch('/api/inventory/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addForm)
            });
            const data = await res.json();
            
            if (!res.ok) {
                setAddError(data.error || '追加に失敗しました');
            } else {
                setShowAddModal(false);
                setAddForm({ amazon_sku: '', amazon_asin: '', amazon_title: '', mercari_url: '' });
                fetchItems();
            }
        } catch (e: any) {
            setAddError(e.message || 'エラーが発生しました');
        } finally {
            setAddLoading(false);
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

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white relative">
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white flex items-center gap-3">
                            在庫監視 <span className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">A版</span>
                        </h1>
                        <p className="text-app-text-muted text-base font-normal leading-normal mt-2">
                            Amazonに出品中の商品を監視し、メルカリでの在庫状況を手動チェック
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCheckAll}
                            disabled={checking || items.length === 0}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${checking ? 'animate-spin' : ''}`} />
                            {checking ? 'チェック中...' : '状態をチェック'}
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-app-element hover:bg-app-surface border border-app-border text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            監視商品を追加
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">監視中</p>
                        <p className="text-3xl font-black text-white">{items.length}</p>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">正常</p>
                        <p className="text-3xl font-black text-green-400">{normalCount}</p>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">注意</p>
                        <p className="text-3xl font-black text-yellow-400">{warningCount}</p>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">危険</p>
                        <p className="text-3xl font-black text-red-500">{dangerCount}</p>
                    </div>
                </div>

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
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                        >
                            <Plus className="w-4 h-4 inline mr-2" />
                            監視商品を追加
                        </button>
                    </div>
                ) : (
                    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-app-border bg-app-element/30">
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase">商品情報</th>
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase">メルカリ状態</th>
                                    <th className="p-4 text-xs font-bold text-app-text-muted uppercase">手動停止支援</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => {
                                    const isDanger = item.alert_level === 'danger';
                                    const isWarn = item.alert_level === 'warning';
                                    return (
                                        <tr key={item.watch_id} className="border-b border-app-border/50 hover:bg-app-element/10 transition-colors">
                                            <td className="p-4 max-w-xs">
                                                <p className="font-bold text-sm truncate" title={item.amazon_title}>{item.amazon_title}</p>
                                                <div className="flex gap-3 mt-1 text-xs text-app-text-muted">
                                                    <span>SKU: {item.amazon_sku}</span>
                                                    <span>ASIN: {item.amazon_asin}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                        isDanger ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        isWarn ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                        'bg-green-500/20 text-green-400 border border-green-500/30'
                                                    }`}>
                                                        {item.last_known_status.toUpperCase()}
                                                    </span>
                                                    {item.alert_reason !== 'none' && (
                                                        <span className="text-xs text-app-text-muted">({item.alert_reason})</span>
                                                    )}
                                                </div>
                                                <a href={item.mercari_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                                    メルカリを開く <ExternalLink className="w-3 h-3" />
                                                </a>
                                                {item.last_checked_at && (
                                                    <p className="text-[10px] text-app-text-muted mt-1">
                                                        最終確認: {new Date(item.last_checked_at).toLocaleString()}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-2">
                                                    <a 
                                                        href={`https://sellercentral.amazon.co.jp/inventory/ref=xx_invmgr_dnav_xx?tbla_myitable=search:${item.amazon_sku}`}
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="text-xs bg-app-element border border-app-border hover:bg-app-border px-3 py-1.5 rounded inline-flex items-center gap-1 justify-center transition-colors shadow-sm"
                                                    >
                                                        セラーセントラル検索 <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button 
                                                        onClick={() => handleCopyMemo(item)}
                                                        className="text-xs bg-app-element border border-app-border hover:bg-app-border px-3 py-1.5 rounded inline-flex items-center justify-center gap-1 transition-colors shadow-sm"
                                                    >
                                                        {copiedId === item.watch_id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-app-text-muted" />}
                                                        停止用メモをコピー
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-app-surface border border-app-border rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">監視商品を追加</h2>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted mb-1">Amazon SKU *</label>
                                <input required value={addForm.amazon_sku} onChange={e => setAddForm({...addForm, amazon_sku: e.target.value})} className="w-full bg-app-base border border-app-border rounded-lg px-3 py-2 text-sm" placeholder="SKU-XXXX" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted mb-1">Amazon ASIN *</label>
                                <input required value={addForm.amazon_asin} onChange={e => setAddForm({...addForm, amazon_asin: e.target.value})} className="w-full bg-app-base border border-app-border rounded-lg px-3 py-2 text-sm" placeholder="B00XXXXXXX" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted mb-1">商品名 *</label>
                                <input required value={addForm.amazon_title} onChange={e => setAddForm({...addForm, amazon_title: e.target.value})} className="w-full bg-app-base border border-app-border rounded-lg px-3 py-2 text-sm" placeholder="商品のタイトル" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted mb-1">仕入れ元 メルカリURL *</label>
                                <input required value={addForm.mercari_url} onChange={e => setAddForm({...addForm, mercari_url: e.target.value})} className="w-full bg-app-base border border-app-border rounded-lg px-3 py-2 text-sm" placeholder="https://jp.mercari.com/item/m123456789" />
                            </div>
                            
                            {addError && <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{addError}</div>}
                            
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-app-border">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-app-text-muted hover:text-white">
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

