import clsx from 'clsx';
import { useSettings } from '../../../hooks/useSettings';
import { Input, Label } from '../../../components/ui/Form';
import { Button } from '../../../components/ui/Button';
import { Card, CardHeader, Section } from '../../../components/ui/card';

export const TargetBlock = () => {
    const { settings, updateSettings } = useSettings();
    const { target } = settings;

    const setMode = (mode: 'url' | 'keyword') => updateSettings({ target: { ...target, mode } });

    return (
        <Section>
            <CardHeader title="1. 対象指定" icon="link" />
            <Card className="p-6">
                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                    <button
                        className={clsx("px-4 py-2 text-sm font-bold border-b-2 transition-colors", target.mode === 'url' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")}
                        onClick={() => setMode('url')}
                    >
                        URLで指定
                    </button>
                    <button
                        className={clsx("px-4 py-2 text-sm font-bold border-b-2 transition-colors", target.mode === 'keyword' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")}
                        onClick={() => setMode('keyword')}
                    >
                        かんたん検索
                    </button>
                </div>

                {target.mode === 'url' ? (
                    <div className="flex flex-col gap-4">
                        <Input
                            label="メルカリのURL (カテゴリまたは検索結果)"
                            placeholder="例) https://jp.mercari.com/search?keyword=vintage..."
                            value={target.url}
                            onChange={(e) => updateSettings({ target: { ...target, url: e.target.value } })}
                            icon="search"
                        />
                        <div className="flex justify-between items-start flex-wrap gap-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                詳細な条件（価格帯、ブランドなど）を含める場合は、ブラウザで検索してURLをコピーしてください。
                            </p>
                            <Button size="sm" variant="outline" icon="check_circle">URLチェック</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="キーワード (必須)"
                                placeholder="例) ポケモンカード, ノースフェイス..."
                                value={target.keyword}
                                onChange={(e) => updateSettings({ target: { ...target, keyword: e.target.value } })}
                            />
                            <Input
                                label="除外キーワード (任意)"
                                placeholder="例) ジャンク, 付属品なし..."
                                value={target.excludeKeyword}
                                onChange={(e) => updateSettings({ target: { ...target, excludeKeyword: e.target.value } })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>カテゴリ (任意)</Label>
                                <select
                                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                                    value={target.category}
                                    onChange={(e) => updateSettings({ target: { ...target, category: e.target.value } })}
                                >
                                    <option value="">指定なし</option>
                                    <option value="レディース">レディース</option>
                                    <option value="メンズ">メンズ</option>
                                    <option value="ベビー・キッズ">ベビー・キッズ</option>
                                    <option value="インテリア・住まい・小物">インテリア・住まい・小物</option>
                                    <option value="本・音楽・ゲーム">本・音楽・ゲーム</option>
                                    <option value="おもちゃ・ホビー・グッズ">おもちゃ・ホビー・グッズ</option>
                                    <option value="家電・スマホ・カメラ">家電・スマホ・カメラ</option>
                                </select>
                            </div>
                            <div>
                                <Label>並び順</Label>
                                <select
                                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5 px-3"
                                    value={target.sort}
                                    onChange={(e) => updateSettings({ target: { ...target, sort: e.target.value as any } })}
                                >
                                    <option value="new">新しい順 (おすすめ)</option>
                                    <option value="recommended">おすすめ順</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end mt-2">
                            <Button size="sm" variant="outline" icon="preview">プレビュー (20件)</Button>
                        </div>
                    </div>
                )}
            </Card>
        </Section>
    );
};
