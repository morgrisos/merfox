import clsx from 'clsx';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const Badge = ({ children, variant = 'neutral', className }: { children: React.ReactNode, variant?: BadgeVariant, className?: string }) => {
    const variants = {
        success: "bg-green-500/10 text-green-700 dark:text-green-400 ring-green-600/20",
        warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20",
        error: "bg-red-500/10 text-red-700 dark:text-red-400 ring-red-600/20",
        info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-600/20",
        neutral: "bg-slate-500/10 text-slate-700 dark:text-slate-400 ring-slate-600/20",
    };

    return (
        <span className={clsx("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset", variants[variant], className)}>
            {children}
        </span>
    );
};
