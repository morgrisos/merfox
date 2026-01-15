import React from 'react';
import clsx from 'clsx';

export const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={clsx("bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm", className)}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className, title, icon }: { children?: React.ReactNode, className?: string, title?: string, icon?: string }) => {
    return (
        <div className={clsx("flex items-center gap-2 mb-4", className)}>
            {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
            {title && <h3 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{title}</h3>}
            {children}
        </div>
    );
};

export const Section = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={clsx("flex flex-col gap-4", className)}>
            {children}
        </div>
    );
};
