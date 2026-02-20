import { LayoutDashboard, History, Activity, Settings, Zap, Link2, Eye } from 'lucide-react';

export const NAV_SECTIONS = [
    {
        title: 'メイン',
        items: [
            { id: 'dashboard', label: 'ホーム', path: '/dashboard', icon: LayoutDashboard },
        ]
    },
    {
        title: 'データ管理',
        items: [
            { id: 'history', label: '履歴', path: '/history', icon: History },
            { id: 'mapping', label: 'カテゴリ変換', path: '/mapping', icon: Link2 },
        ]
    },
    {
        title: '高度な機能',
        items: [
            { id: 'inventory', label: '在庫監視', path: '/inventory', icon: Eye },
            { id: 'automation', label: '定期実行', path: '/scraper', icon: Activity },
        ]
    },
    {
        title: '設定',
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
