import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SimpleToastProps {
    message: string;
    onClose: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
    duration?: number; // milliseconds
}

export const SimpleToast: React.FC<SimpleToastProps> = ({
    message,
    onClose,
    action,
    duration = 8000
}) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            className="fixed bottom-6 right-6 z-50 bg-app-element border border-primary/30 rounded-lg shadow-xl p-4 min-w-[320px] max-w-[480px] animate-slide-up"
            role="alert"
        >
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <p className="text-white text-sm font-medium mb-2">{message}</p>
                    {action && (
                        <button
                            onClick={() => {
                                action.onClick();
                                onClose();
                            }}
                            className="text-xs font-bold text-primary hover:text-blue-400 transition-colors underline"
                        >
                            {action.label}
                        </button>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-app-text-muted hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// Hook for managing toast state
export const useToast = () => {
    const [toast, setToast] = React.useState<{
        message: string;
        action?: { label: string; onClick: () => void };
    } | null>(null);

    const showToast = (
        message: string,
        action?: { label: string; onClick: () => void }
    ) => {
        setToast({ message, action });
    };

    const hideToast = () => {
        setToast(null);
    };

    const ToastComponent = toast ? (
        <SimpleToast
            message={toast.message}
            action={toast.action}
            onClose={hideToast}
        />
    ) : null;

    return { showToast, hideToast, ToastComponent };
};
