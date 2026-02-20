import React from 'react';

interface WizardProgressProps {
    currentStep: number;
    totalSteps?: number;
}

export function WizardProgress({ currentStep, totalSteps = 6 }: WizardProgressProps) {
    return (
        <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center justify-between text-sm">
                <span className="text-app-text-muted font-medium">Step {currentStep} / {totalSteps}</span>
                <span className="text-primary font-bold">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="flex gap-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
                    <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step < currentStep
                            ? 'bg-primary'
                            : step === currentStep
                                ? 'bg-primary/70'
                                : 'bg-gray-700'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
