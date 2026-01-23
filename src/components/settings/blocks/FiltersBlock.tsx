import { useState } from 'react';
import clsx from 'clsx';
import { useSettings } from '../../../hooks/useSettings';
import { Card, CardHeader, Section } from '../../../components/ui/card';
import { Toggle, Label } from '../../../components/ui/Form';
import { Button } from '../../../components/ui/Button';

export const FiltersBlock = () => {
    const { settings, updateSettings } = useSettings();
    const { filters } = settings;
    const [ngMode, setNgMode] = useState<'partial' | 'regex'>('partial');
    const [tempNag, setTempNg] = useState('');

    const toggleFilter = (key: keyof typeof filters) => {
        updateSettings({ filters: { ...filters, [key]: !filters[key] } });
    };

    const addNgWord = () => {
        if (!tempNag) return;
        if (ngMode === 'partial') {
            updateSettings({ filters: { ...filters, ngWords: [...filters.ngWords, tempNag] } });
        } else {
            updateSettings({ filters: { ...filters, ngRegex: [...filters.ngRegex, tempNag] } });
        }
        setTempNg('');
    };

    const removeNgWord = (index: number, mode: 'partial' | 'regex') => {
        if (mode === 'partial') {
            const newWords = [...filters.ngWords];
            newWords.splice(index, 1);
            updateSettings({ filters: { ...filters, ngWords: newWords } });
        } else {
            const newRegex = [...filters.ngRegex];
            newRegex.splice(index, 1);
            updateSettings({ filters: { ...filters, ngRegex: newRegex } });
        }
    };

    return (
        <Section>
            <CardHeader title="3. フィルタ" icon="filter_alt" />
            <Card className="p-6">
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Toggle
                            label="メルカリShopsを除外"
                            checked={filters.excludeShops}
                            onChange={() => toggleFilter('excludeShops')}
                        />
                        <Toggle
                            label="Unknown (怪しい出品) を除外"
                            checked={filters.excludeUnknown}
                            onChange={() => toggleFilter('excludeUnknown')}
                        />
                        <Toggle
                            label="送料無料だけ (着払い除外)"
                            checked={filters.onlyFreeShipping}
                            onChange={() => toggleFilter('onlyFreeShipping')}
                        />
                    </div>

                    <hr className="border-slate-200 dark:border-slate-700" />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <Label className="!mb-0">NGワード除外</Label>
                            <div className="flex gap-4 text-xs font-semibold">
                                <Label className="!mb-0 cursor-pointer">
                                    <input type="checkbox" className="mr-1" checked={filters.ngTargetTitle} onChange={() => toggleFilter('ngTargetTitle')} />
                                    タイトル
                                </Label>
                                <Label className="!mb-0 cursor-pointer">
                                    <input type="checkbox" className="mr-1" checked={filters.ngTargetDescription} onChange={() => toggleFilter('ngTargetDescription')} />
                                    説明文
                                </Label>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#101822] rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700">
                                <button
                                    className={clsx("px-3 py-1.5 text-xs font-bold border-b-2 transition-colors", ngMode === 'partial' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400")}
                                    onClick={() => setNgMode('partial')}
                                >
                                    部分一致NG (初心者)
                                </button>
                                <button
                                    className={clsx("px-3 py-1.5 text-xs font-bold border-b-2 transition-colors", ngMode === 'regex' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400")}
                                    onClick={() => setNgMode('regex')}
                                >
                                    正規表現NG (上級者)
                                </button>
                            </div>

                            <div className="flex gap-2 mb-3">
                                <input
                                    className="flex-1 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a2430] text-xs py-2 px-3"
                                    placeholder={ngMode === 'partial' ? "除外したい言葉..." : "/(new|unused)/i"}
                                    value={tempNag}
                                    onChange={(e) => setTempNg(e.target.value)}
                                // onEnter key logic could be added here
                                />
                                <Button size="sm" onClick={addNgWord} icon="add">追加</Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {ngMode === 'partial' ? (
                                    filters.ngWords.map((word, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded text-xs">
                                            {word}
                                            <button onClick={() => removeNgWord(i, 'partial')} className="hover:text-red-800"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                        </span>
                                    ))
                                ) : (
                                    filters.ngRegex.map((word, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded text-xs font-mono">
                                            {word}
                                            <button onClick={() => removeNgWord(i, 'regex')} className="hover:text-purple-800"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                        </span>
                                    ))
                                )}
                                {((ngMode === 'partial' && filters.ngWords.length === 0) || (ngMode === 'regex' && filters.ngRegex.length === 0)) && (
                                    <span className="text-xs text-slate-400 italic">登録なし</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </Section>
    );
};
