import React from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/SimpleToast';

const AMAZON_HEADERS = [
    'sku', 'product-id', 'product-id-type', 'price',
    'minimum-seller-allowed-price', 'maximum-seller-allowed-price',
    'item-condition', 'quantity', 'add-delete', 'will-ship-internationally',
    'expedited-shipping', 'standard-plus', 'item-note',
    'fulfillment-center-id', 'product-tax-code', 'leadtime-to-ship',
    'merchant_shipping_group_name'
];

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function MappingEditor({ runId, mode, returnUrl }: { runId?: string; mode?: 'global' | 'wizard'; returnUrl?: string }) {
    const router = useRouter();
    const { showToast, ToastComponent } = useToast();
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [filterPending, setFilterPending] = React.useState(true);
    const [localChanges, setLocalChanges] = React.useState<Record<string, string>>({});
    const [saving, setSaving] = React.useState(false);
    const [apiRunId, setApiRunId] = React.useState<string | null>(null);

    const runIdFromQuery = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('runId')
        : null;
    const effectiveRunId = runId || runIdFromQuery || null;
    const effectiveMode = mode ?? (effectiveRunId ? 'wizard' : 'global');
    const ctaVisible = effectiveMode === 'wizard';

    console.log('[MAPPING_MODE]', effectiveMode);
    console.log('[MAPPING_EFFECTIVE_RUN_ID]', effectiveRunId);
    console.log('[MAPPING_CTA_VISIBLE]', ctaVisible);

    const fetchData = async () => {
        setLoading(true);
        try {
            const url = effectiveRunId ? `/api/mapping?runId=${effectiveRunId}` : '/api/mapping';
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                if (json.runId) setApiRunId(json.runId);
                setLocalChanges({});
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [effectiveRunId]);

    const handleAsinChange = (rowKey: string, newVal: string) => {
        setLocalChanges(prev => ({ ...prev, [rowKey]: newVal }));
    };

    const handleSave = async () => {
        if (Object.keys(localChanges).length === 0) return;
        setSaving(true);
        try {
            const res = await fetch('/api/mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: localChanges })
            });
            if (res.ok) {
                const rid = effectiveRunId || runIdFromQuery;
                if (rid) {
                    showToast('カテゴリ変換を保存しました', {
                        label: 'このリサーチで再変換',
                        onClick: () => router.push(`/wizard/step5?runId=${rid}&action=reconvert`)
                    });
                } else {
                    showToast('カテゴリ変換を保存しました');
                }
                fetchData();
            } else {
                alert('保存に失敗しました');
            }
        } catch (e) {
            alert('エラーが発生しました');
        } finally {
            setSaving(false);
        }
    };

    const handleNextWithSave = async () => {
        console.log('[MAPPING_NAV_NEXT]', effectiveRunId);
        if (Object.keys(localChanges).length > 0) {
            setSaving(true);
            try {
                const res = await fetch('/api/mapping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: localChanges })
                });
                if (!res.ok) {
                    alert('保存に失敗しました');
                    return;
                }
            } catch {
                alert('エラーが発生しました');
                return;
            } finally {
                setSaving(false);
            }
        }
        if (effectiveRunId) {
            router.push(`/wizard/step5?runId=${effectiveRunId}`);
        } else {
            router.push('/wizard/step5');
        }
    };

    const handleGlobalTsvExport = async () => {
        const targetRunId = effectiveRunId || apiRunId;
        console.log('[GLOBAL_TSV_EXPORT_START]', { targetRunId });

        if (targetRunId) {
            console.log('[GLOBAL_TSV_EXPORT_MODE]', 'run', targetRunId);
            try {
                const convertRes = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ runId: targetRunId })
                });
                if (!convertRes.ok) {
                    alert('変換に失敗しました');
                    return;
                }
                const fileRes = await fetch(`/api/files/amazon?runId=${targetRunId}`);
                if (!fileRes.ok) {
                    alert('ファイルの取得に失敗しました');
                    return;
                }
                const blob = await fileRes.blob();
                console.log('[GLOBAL_TSV_EXPORT_DONE]', 'run');
                triggerDownload(blob, `amazon_upload_${targetRunId}.tsv`);
            } catch (e) {
                alert('エラーが発生しました');
            }
        } else {
            console.log('[GLOBAL_TSV_EXPORT_MODE]', 'standalone');
            const rows = data?.rows ?? [];
            const exportRows = rows.filter((r: any) => {
                const asin = localChanges[r.rowKey] !== undefined ? localChanges[r.rowKey] : r.asin;
                return asin && asin.length >= 10;
            });
            console.log('[GLOBAL_TSV_EXPORT_ROWS]', exportRows.length);

            if (exportRows.length === 0) {
                console.log('[GLOBAL_TSV_EXPORT_EMPTY]');
                alert('出力できる行がありません。ASIN（10文字以上）を入力してください。');
                return;
            }

            const tsvLines = [AMAZON_HEADERS.join('\t')];
            for (const r of exportRows) {
                const asin = localChanges[r.rowKey] !== undefined ? localChanges[r.rowKey] : r.asin;
                const priceNum = parseInt(String(r.price || '0').replace(/[^0-9]/g, ''), 10) || 0;
                const salePrice = Math.max(priceNum + 3000, 4980);
                tsvLines.push([
                    `MF-${r.id}`,
                    asin,
                    'ASIN',
                    salePrice,
                    '', '', '11', '1', 'a', '', '', '',
                    '中古品です。',
                    '', '', '2', ''
                ].join('\t'));
            }

            const bom = '\uFEFF';
            const blob = new Blob([bom + tsvLines.join('\n')], { type: 'text/tab-separated-values;charset=utf-8' });
            console.log('[GLOBAL_TSV_EXPORT_DONE]', 'standalone');
            triggerDownload(blob, `amazon_upload_standalone.tsv`);
        }
    };

    const hasChanges = Object.keys(localChanges).length > 0;

    const displayRows = data?.rows?.filter((r: any) => {
        if (!filterPending) return true;
        const currentVal = localChanges[r.rowKey] !== undefined ? localChanges[r.rowKey] : r.asin;
        return !currentVal || r.isPending;
    }) || [];

    return (
        <div className="flex-1 overflow-y-auto bg-app-base text-white">
            <header className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white mb-1">マッピング編集</h2>
                        <div className="text-app-text-muted text-xs bg-app-surface p-3 mt-2 rounded border border-app-border space-y-1">
                            <p>・ASIN = Amazonの商品ID（B0〜で始まる10桁）です。</p>
                            <p>・抽出した商品(Mercari)に対応するAmazon ASINを入力して保存してください。</p>
                            <p>・ASINはAmazonの商品ページURL(dp/B0xxxx)や詳細欄に表示されています。</p>
                            <p>・最低1件でもOKです。保存後にStep6でTSV生成が可能になります。</p>
                        </div>
                    </div>
                    {(data?.meta?.total ?? 0) > 0 && (
                        <div className="flex gap-4">
                            <div className="bg-app-element px-3 py-1 rounded border border-app-border">
                                <span className="text-app-text-muted text-[10px] uppercase tracking-wider font-bold block">Total</span>
                                <span className="text-lg font-bold font-mono">{data.meta.total}</span>
                            </div>
                            <div className="bg-app-element px-3 py-1 rounded border border-app-border">
                                <span className="text-app-text-muted text-[10px] uppercase tracking-wider font-bold block">Pending</span>
                                <span className={`text-lg font-bold font-mono ${data.meta.pending > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {data.meta.pending}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="text-center py-10 text-app-text-muted animate-pulse">読み込み中...</div>
            ) : !data ? (
                <div className="text-center py-10 text-app-text-muted">データが見つかりません。Runを実行してください。</div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between bg-app-surface p-3 rounded-xl border border-app-border">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${filterPending ? 'bg-primary' : 'bg-app-border'}`} onClick={() => setFilterPending(!filterPending)}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${filterPending ? 'translate-x-3' : ''}`} />
                                </div>
                                <span className="text-xs font-medium text-white">未設定のみ</span>
                            </label>
                            {data.meta.asinCol === 'MISSING' && (
                                <span className="text-red-500 text-xs font-bold flex items-center gap-1">
                                    列定義エラー
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {returnUrl && (
                                <button onClick={() => router.push(returnUrl)} className="px-4 py-1.5 rounded-lg border border-app-border text-xs hover:bg-app-element">
                                    戻る
                                </button>
                            )}
                            {effectiveMode === 'global' && (
                                <>
                                    <button
                                        disabled={!hasChanges || saving || data.meta.asinCol === 'MISSING'}
                                        onClick={handleSave}
                                        className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${hasChanges
                                            ? 'bg-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
                                            : 'bg-app-border text-app-text-muted cursor-not-allowed'
                                            }`}
                                    >
                                        {saving ? '...' : '保存'}
                                    </button>
                                    <button
                                        onClick={handleGlobalTsvExport}
                                        className="px-6 py-1.5 rounded-lg text-sm font-bold bg-green-700 text-white hover:bg-green-600 transition-all"
                                    >
                                        TSV出力
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-app-element text-app-text-muted border-b border-app-border sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-bold w-[80px]">ID</th>
                                        <th className="px-4 py-3 font-bold">商品</th>
                                        <th className="px-4 py-3 font-bold w-[180px]">ASIN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border text-white">
                                    {displayRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-app-text-muted text-xs">
                                                {filterPending ? 'すべて設定済みです' : 'データなし'}
                                            </td>
                                        </tr>
                                    ) : (
                                        displayRows.map((row: any) => {
                                            const val = localChanges[row.rowKey] !== undefined ? localChanges[row.rowKey] : row.asin;
                                            return (
                                                <tr key={row.rowKey} className="hover:bg-app-element transition-colors">
                                                    <td className="px-4 py-2 font-mono text-[10px] text-app-text-muted">
                                                        {row.id}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col gap-0.5 max-w-[300px]">
                                                            <div className="truncate font-bold text-xs" title={row.title}>{row.title}</div>
                                                            {row.url && <a href={row.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline truncate">{row.url}</a>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={val}
                                                            onChange={(e) => handleAsinChange(row.rowKey, e.target.value)}
                                                            disabled={data.meta.asinCol === 'MISSING'}
                                                            placeholder="B0..."
                                                            className={`bg-app-base border border-app-border rounded px-2 py-1 text-white text-xs w-full focus:border-primary focus:outline-none ${!val ? 'border-red-500/50 bg-red-900/10' : ''
                                                                }`}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Wizard CTA */}
                    {ctaVisible && (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleNextWithSave}
                                disabled={saving}
                                className="px-8 py-2.5 rounded-lg text-sm font-bold bg-primary text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                {saving ? '保存中...' : 'Amazon TSV変換へ →'}
                            </button>
                        </div>
                    )}
                </div>
            )}
            {ToastComponent}
        </div>
    );
}
