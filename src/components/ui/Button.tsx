import React, { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    loading,
    className,
    disabled,
    ...props
}, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95 border border-transparent",
        secondary: "bg-slate-800 text-white hover:bg-slate-700 active:scale-95 border border-transparent",
        danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 active:scale-95 border border-transparent",
        ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
        outline: "bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
    };

    const sizes = {
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-10 px-5 text-sm gap-2",
        lg: "h-12 px-6 text-base gap-2.5"
    };

    return (
        <button
            ref={ref}
            className={clsx(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className="material-symbols-outlined animate-spin text-lg">sync</span>}
            {!loading && icon && <span className="material-symbols-outlined text-[1.25em]">{icon}</span>}
            {children}
        </button>
    );
});
