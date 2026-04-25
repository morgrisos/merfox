import React from 'react';

interface PageHeaderProps {
    title: React.ReactNode;
    description?: string;
    actions?: React.ReactNode;
    icon?: React.ReactNode;
}

export function PageHeader({ title, description, actions, icon }: PageHeaderProps) {
    return (
        <header className="flex flex-col gap-4 mb-8" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black leading-tight tracking-tight text-white flex items-center gap-3">
                        {icon && <span className="text-primary flex-shrink-0">{icon}</span>}
                        {title}
                    </h1>
                    {description && (
                        <p className="text-app-text-muted text-sm font-normal leading-normal mt-2">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}
