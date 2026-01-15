import React, { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <label className={clsx("block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2", className)}>
        {children}
    </label>
);

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: string;
    label?: string;
    containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ icon, label, className, containerClassName, ...props }, ref) => {
    return (
        <div className={clsx("flex flex-col", containerClassName)}>
            {label && <Label>{label}</Label>}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">{icon}</span>
                    </div>
                )}
                <input
                    ref={ref}
                    className={clsx(
                        "block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5",
                        icon ? "pl-10" : "pl-4",
                        className
                    )}
                    {...props}
                />
            </div>
        </div>
    );
});

export const Checkbox = ({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) => (
    <label className={clsx("flex items-center gap-3 cursor-pointer", className)}>
        <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary bg-transparent text-primary"
            {...props}
        />
        <span className="text-sm text-slate-700 dark:text-slate-300 select-none">{label}</span>
    </label>
);

export const Toggle = ({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
    <div className={clsx("flex items-center justify-between", disabled && "opacity-50 pointer-events-none")}>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <button
            type="button"
            className={clsx(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
            )}
            role="switch"
            aria-checked={checked}
            onClick={() => !disabled && onChange(!checked)}
        >
            <span
                aria-hidden="true"
                className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    checked ? 'translate-x-5' : 'translate-x-0'
                )}
            />
        </button>
    </div>
);
