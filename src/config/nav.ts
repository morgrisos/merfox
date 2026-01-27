import { LayoutDashboard, History, Table2, TerminalSquare, Settings, Zap } from 'lucide-react';

export const NAV_SECTIONS = [
    {
        title: 'メイン機能',
        items: [
            { id: 'dashboard', label: 'ホーム', path: '/dashboard', icon: LayoutDashboard },
            { id: 'runs', label: '履歴 (Runs)', path: '/runs', icon: History },
            { id: 'mapping', label: 'マッピング', path: '/mapping', icon: Table2 }
        ]
    },
    {
        title: 'ツール',
        items: [
            { id: 'scraper', label: 'スクレイパー', path: '/scraper', icon: TerminalSquare },
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
