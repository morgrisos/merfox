import React from 'react';
import { Construction } from 'lucide-react';

export const ComingSoon = ({ title = "Coming Soon", description = "この機能は現在開発中です。" }: { title?: string, description?: string }) => {
    return (
        <div className="bg-app-surface border border-app-border p-6 rounded-xl flex flex-col items-center justify-center text-center py-12">
            <div className="p-4 rounded-full bg-app-element mb-4">
                <Construction className="w-8 h-8 text-app-text-muted" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-app-text-muted text-sm max-w-md">{description}</p>
        </div>
    );
};
