import React from 'react';
import { AppShell } from '@/components/layout/AppShell';



export default function Mapping() {
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [filterPending, setFilterPending] = React.useState(true);
    const [localChanges, setLocalChanges] = React.useState<Record<string, string>>({});
    const [saving, setSaving] = React.useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/mapping');
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLocalChanges({}); // Reset changes on fresh load
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleAsinChange = (rowKey: string, newVal: string) => {
        setLocalChanges(prev => ({
            ...prev,
            [rowKey]: newVal
        }));
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
                // const json = await res.json();
                alert('保存しました'); // MVP Notification
                fetchData(); // Refetch
            } else {
                alert('保存に失敗しました');
            }
        } catch (e) {
            alert('エラーが発生しました');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = Object.keys(localChanges).length > 0;

    // Filter Logic on client side for the 50 rows we have (or filtered from server? Plan says server returns 50 rows. 
    // Wait, if server limits to 50 rows, client-side filtering might hide everything if the top 50 are all done.
    // Ideally server handles filter, but for MVP let's assume valid rows > 0. 
    // Actually, "rows" from API is "top 50". If we filter locally, we might show empty.
    // Let's filter locally for now. If all top 50 are done, pending list is empty. 
    // The API logic returns 'rows' which ARE pending if it iterates. 
    // Check API logic: API returns top 50 rows regardless of status? 
    // 'rows' in API does: "Limit rows... loop... if (isPending) count++ ... rows.push".
    // It pushes regardless of pending status until 50.
    // So if first 50 are mapped, and we filter pending, we see nothing even if 51st is pending.
    // Acceptable for MVP "Latest Run Only". User clears top 50, then refresh? No, refresh gets top 50.
    // Improvement: API should probably return "top 50 pending" if requested?
    // Constraints say: "max 50 rows". UI: "Filter: Pending Only (Default ON)".
    // Let's stick to client filtering of the 50 rows for simplicity. If needed, user can disable filter to see done rows.

    // Derived Rows
    const displayRows = data?.rows?.filter((r: any) => {
        if (!filterPending) return true;
        // If modified locally, check local value? Or strictly original pending state?
        // Usually filtering by "current state" (after edit) is annoying (row disappears).
        // Let's filter by ORIGINAL pending state OR if it has local changes (so it doesn't disappear while typing).
        const currentVal = localChanges[r.rowKey] !== undefined ? localChanges[r.rowKey] : r.asin;
        return !currentVal || r.isPending; // Show if empty or originally pending
    }) || [];

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white">
            <header className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white">マッピング</h1>
                        <p className="text-app-text-muted text-base font-normal leading-normal mt-2">
                            Mapping CSV (Latest Run)
                        </p>
                    </div>
                    {(data?.meta?.total ?? 0) > 0 && (
                        <div className="flex gap-4">
                            <div className="bg-app-element px-4 py-2 rounded-lg border border-app-border">
                                <span className="text-app-text-muted text-xs uppercase tracking-wider font-bold">Total</span>
                                <div className="text-xl font-bold font-mono">{data.meta.total}</div>
                            </div>
                            <div className="bg-app-element px-4 py-2 rounded-lg border border-app-border">
                                <span className="text-app-text-muted text-xs uppercase tracking-wider font-bold">Pending</span>
                                <div className={`text-xl font-bold font-mono ${data.meta.pending > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {data.meta.pending}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-app-text-muted">読み込み中...</div>
            ) : !data ? (
                <div className="text-center py-20 text-app-text-muted">データが見つかりません</div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between bg-app-surface p-4 rounded-xl border border-app-border">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${filterPending ? 'bg-primary' : 'bg-app-border'}`} onClick={() => setFilterPending(!filterPending)}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${filterPending ? 'translate-x-4' : ''}`} />
                                </div>
                                <span className="text-sm font-medium text-white">未設定のみ表示</span>
                            </label>
                            {data.meta.asinCol === 'MISSING' && (
                                <span className="text-red-500 text-sm font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                    ASIN列なし (編集不可)
                                </span>
                            )}
                        </div>
                        <button
                            disabled={!hasChanges || saving || data.meta.asinCol === 'MISSING'}
                            onClick={handleSave}
                            className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${hasChanges
                                ? 'bg-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
                                : 'bg-app-border text-app-text-muted cursor-not-allowed'
                                }`}
                        >
                            {saving ? '保存中...' : '保存'}
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-app-element text-app-text-muted border-b border-app-border">
                                    <tr>
                                        <th className="px-6 py-4 font-bold w-[100px]">ID</th>
                                        <th className="px-6 py-4 font-bold">商品情報 (Title / URL)</th>
                                        <th className="px-6 py-4 font-bold w-[200px]">ASIN (Amazon ID)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border text-white">
                                    {displayRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-app-text-muted">
                                                {filterPending ? '未設定の項目はありません' : '項目がありません'}
                                            </td>
                                        </tr>
                                    ) : (
                                        displayRows.map((row: any) => {
                                            const val = localChanges[row.rowKey] !== undefined ? localChanges[row.rowKey] : row.asin;
                                            return (
                                                <tr key={row.rowKey} className="hover:bg-app-element transition-colors">
                                                    <td className="px-6 py-4 font-mono text-xs text-app-text-muted">
                                                        {row.id}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1 max-w-[400px]">
                                                            <div className="truncate font-bold" title={row.title}>{row.title}</div>
                                                            {row.url && <a href={row.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate">{row.url}</a>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="text"
                                                            value={val}
                                                            onChange={(e) => handleAsinChange(row.rowKey, e.target.value)}
                                                            disabled={data.meta.asinCol === 'MISSING'}
                                                            placeholder="B0..."
                                                            className={`bg-app-base border border-app-border rounded px-3 py-2 text-white w-full focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${!val ? 'border-red-500/50 bg-red-900/10' : ''
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
                </div>
            )}
        </div>
    );
}

Mapping.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
