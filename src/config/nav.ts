import { LayoutDashboard, History, Table2, Activity, Settings, Zap } from 'lucide-react';

export const NAV_SECTIONS = [
    {
        title: 'メイン機能',
        items: [
            { id: 'dashboard', label: 'ホーム', path: '/dashboard', icon: LayoutDashboard },
            { id: 'scraper', label: '在庫監視', path: '/scraper', icon: Activity },
            { id: 'runs', label: '履歴 (Runs)', path: '/runs', icon: History },
            { id: 'mapping', label: 'マッピング', path: '/mapping', icon: Table2 }
        ]
    },
    {
        title: 'ツール',
        items: [
            { id: 'settings', label: '設定', path: '/settings', icon: Settings }
        ]
    }
];

export const PRIMARY_ACTION = {
    id: 'research',
    label: '新規リサーチ',
    path: '/wizard/step1',
    icon: Zap
};
