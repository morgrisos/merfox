import { useSettings } from '../../../hooks/useSettings';
import { Card, CardHeader, Section } from '../../../components/ui/card';
import { Checkbox, Label } from '../../../components/ui/Form';

export const StopConditionBlock = () => {
    const { settings, updateSettings } = useSettings();
    const { stopConditions } = settings;

    const updateCondition = (key: keyof typeof stopConditions, val: any) => {
        updateSettings({ stopConditions: { ...stopConditions, [key]: val } });
    };

    return (
        <Section>
            <CardHeader title="4. 停止条件 & 安全装置" icon="timer_off" />
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-4">
                        <Label>停止条件 (いずれかに到達で停止)</Label>
                        <div className="flex flex-col gap-3 pl-2">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    label="件数で止める"
                                    checked={stopConditions.useCount}
                                    onChange={(e) => updateCondition('useCount', e.target.checked)}
                                />
                                <input
                                    type="number"
                                    className="w-24 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] py-1 px-2 text-sm disabled:opacity-50"
                                    value={stopConditions.countLimit}
                                    disabled={!stopConditions.useCount}
                                    onChange={(e) => updateCondition('countLimit', Number(e.target.value))}
                                />
                                <span className="text-sm text-slate-500">件</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    label="時間で止める"
                                    checked={stopConditions.useTime}
                                    onChange={(e) => updateCondition('useTime', e.target.checked)}
                                />
                                <input
                                    type="number"
                                    className="w-24 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] py-1 px-2 text-sm disabled:opacity-50"
                                    value={stopConditions.timeLimit}
                                    max={60}
                                    disabled={!stopConditions.useTime}
                                    onChange={(e) => updateCondition('timeLimit', Math.min(60, Number(e.target.value)))}
                                />
                                <span className="text-sm text-slate-500">分 (最大60)</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    label="手動で止める"
                                    checked={true}
                                    disabled
                                />
                                <span className="text-xs text-slate-400">(停止ボタンは常に表示されます)</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                            <span className="material-symbols-outlined">gpp_maybe</span>
                            <span className="font-bold text-sm">安全装置 (固定)</span>
                        </div>
                        <ul className="list-disc list-inside text-xs text-red-600/80 dark:text-red-400/80 space-y-1 ml-1">
                            <li>1日の最大取得数: <b>1000件</b> まで</li>
                            <li>高額商品の除外: <b>100万円</b> 以上</li>
                            <li>Unknown (判定不能) はデフォルト除外</li>
                            <li>連続エラー時は自動停止</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </Section>
    );
};
