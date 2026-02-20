import { useState } from 'react';
import Papa from 'papaparse';

export const Converter = () => {
    const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
    const [failures, setFailures] = useState<{ reason: string; count: number }[]>([]);
    const [rawFile, setRawFile] = useState<File | null>(null);
    const [mappingFile, setMappingFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [amazonTsvUrl, setAmazonTsvUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'raw' | 'mapping') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'raw') setRawFile(e.target.files[0]);
            else setMappingFile(e.target.files[0]);
        }
    };

    const processConversion = () => {
        if (!rawFile || !mappingFile) return;
        setIsProcessing(true);
        setAmazonTsvUrl(null);

        Papa.parse(rawFile, {
            header: true,
            complete: (rawResults) => {
                Papa.parse(mappingFile, {
                    header: true,
                    complete: (mapResults) => {
                        executeConversion(rawResults.data, mapResults.data);
                        setIsProcessing(false);
                    }
                });
            }
        });
    };

    const executeConversion = (rawData: any[], mapData: any[]) => {
        let successCount = 0;
        let failCount = 0;
        const failureCounts: Record<string, number> = {
            NO_PRODUCT_ID: 0,
            INVALID_PRICE: 0,
            FILTER_EXCLUDED: 0,
            OTHER: 0
        };

        const mapIndex = new Map(mapData.map((m: any) => [m.item_id, m]));
        const validItems = [];

        for (const item of rawData) {
            if (!item.item_id) continue;

            const mapping = mapIndex.get(item.item_id);

            if (!mapping || !mapping.product_id) {
                failCount++;
                failureCounts.NO_PRODUCT_ID++;
                continue;
            }

            const price = parseInt(item.price_yen, 10);
            if (isNaN(price) || price <= 0) {
                failCount++;
                failureCounts.INVALID_PRICE++;
                continue;
            }

            validItems.push({
                sku: `MF-${item.item_id}`,
                product_id: mapping.product_id,
                product_id_type: mapping.product_id_type || 'ASIN',
                price: price,
                quantity: 1,
                condition_type: 'used_good',
                condition_note: item.description ? item.description.slice(0, 500).replace(/(\r\n|\n|\r)/gm, " ") : '',
                handling_time: 2,
                fulfillment_channel: 'MFN',
                shipping_template_name: ''
            });
            successCount++;
        }

        setStats({
            total: rawData.length,
            success: successCount,
            failed: failCount
        });

        setFailures(Object.entries(failureCounts)
            .filter(([_, count]) => count > 0)
            .map(([reason, count]) => ({ reason, count }))
        );

        if (validItems.length > 0) {
            const tsv = Papa.unparse(validItems, { delimiter: '\t', newline: '\r\n' });
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
            setAmazonTsvUrl(URL.createObjectURL(blob));
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative">
            <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-surface-light/80 dark:bg-[#111418]/90 backdrop-blur-md px-4 sm:px-10 py-3 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-xl">cloud_upload</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">データ変換 (Amazon出品用)</h2>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Input Sources */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-surface-light dark:bg-[#1a2430] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">input</span>
                                    入力ソース
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1. Raw Data (items.csv)</label>
                                        <div className="flex items-center gap-3">
                                            <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, 'raw')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                            {rawFile && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                        </div>
                                    </div>
                                    <div className="w-full h-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">2. Mapping Table (mapping.csv)</label>
                                        <div className="flex items-center gap-3">
                                            <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, 'mapping')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                            {mappingFile && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">必須カラム: item_id, product_id, product_id_type</p>
                                    </div>
                                </div>
                            </div>

                            {/* Failure Reasons Section */}
                            {stats.failed > 0 && (
                                <div className="bg-surface-light dark:bg-[#1a2430] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-orange-500">warning</span>
                                        変換失敗の理由
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        {failures.map(f => (
                                            <div key={f.reason} className="flex justify-between items-center text-sm p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                                <span className="font-bold text-red-600 dark:text-red-400">{f.reason}</span>
                                                <span className="bg-white dark:bg-[#101822] px-2 py-0.5 rounded text-xs font-mono border border-slate-200 dark:border-slate-700">{f.count}件</span>
                                            </div>
                                        ))}
                                        <p className="text-xs text-slate-400 mt-2">
                                            失敗したアイテムは出力ファイルに含まれません。マッピング設定を確認してください。
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className={`bg-surface-light dark:bg-[#1a2430] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm ${!rawFile || !mappingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                                <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">変換ステータス</h3>
                                <div className="flex flex-col items-center justify-center py-6">
                                    {isProcessing ? (
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                                    ) : stats.total > 0 ? (
                                        <div className="flex justify-around w-full">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-primary">{stats.success}</div>
                                                <div className="text-sm text-slate-500">成功</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-red-500">{stats.failed}</div>
                                                <div className="text-sm text-slate-500">失敗</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-slate-700 dark:text-white">{stats.total}</div>
                                                <div className="text-sm text-slate-500">合計</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400">準備完了</div>
                                    )}
                                </div>
                                <button
                                    onClick={processConversion}
                                    disabled={!rawFile || !mappingFile || isProcessing}
                                    className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    変換を実行
                                </button>
                            </div>
                        </div>

                        {/* 2. Output Preview */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-surface-light dark:bg-[#1a2430] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col">
                                <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">table_chart</span>
                                    出力プレビュー (Amazon TSV)
                                </h3>

                                <div className="flex-1 bg-slate-50 dark:bg-[#101822] rounded-lg border border-slate-200 dark:border-slate-700 p-4 font-mono text-xs overflow-auto max-h-[400px]">
                                    {amazonTsvUrl ? (
                                        <div className="text-slate-600 dark:text-slate-400 whitespace-pre">
                                            Conversion Complete. Ready to download.
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400">
                                            変換を実行するとここにプレビューが表示されます
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-4">
                                    {amazonTsvUrl ? (
                                        <a
                                            href={amazonTsvUrl}
                                            download="amazon_upload.tsv"
                                            className="flex-1 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined">download</span>
                                            TSVをダウンロード
                                        </a>
                                    ) : (
                                        <button disabled className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-400 rounded-lg font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                            <span className="material-symbols-outlined">download</span>
                                            TSVをダウンロード
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Converter;
