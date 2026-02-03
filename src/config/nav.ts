import { LayoutDashboard, History, Activity, Settings, Zap, FileText, Clock, Link2 } from 'lucide-react';

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
            { id: 'runs', label: '履歴', path: '/runs', icon: History },
            { id: 'mapping', label: 'カテゴリ変換', path: '/mapping', icon: Link2 },
            { id: 'files', label: 'ファイル', path: '/csv', icon: FileText },
        ]
    },
    {
        title: '高度な機能',
        items: [
            { id: 'scraper', label: 'リアルタイム抽出', path: '/scraper', icon: Activity },
            { id: 'automation', label: '定期実行ルール', path: '/automation', icon: Clock },
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
