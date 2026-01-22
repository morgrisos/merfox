import React, { createContext, useContext, useState } from 'react';

type Outcome = {
    success: boolean;
    latestRunId?: string;
    itemsCount: number;
    failedCount: number;
};

type OutcomeContextType = {
    outcome: Outcome;
    setOutcome: (o: Outcome) => void;
    refreshOutcome: () => Promise<void>;
};

const OutcomeContext = createContext<OutcomeContextType | undefined>(undefined);

export const OutcomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [outcome, setOutcome] = useState<Outcome>({
        success: false,
        itemsCount: 0,
        failedCount: 0
    });

    const refreshOutcome = async () => {
        // In a real app, this might fetch from API. 
        // For now, we rely on setOutcome being called by Steps.
        // Or we could fetch /api/runs?limit=1 to get latest info.
        // Mocking fetch for robustness:
        try {
            // If we had a runId, we could fetch details. 
            // For now just resolve.
        } catch (e) { }
    };

    return (
        <OutcomeContext.Provider value={{ outcome, setOutcome, refreshOutcome }}>
            {children}
        </OutcomeContext.Provider>
    );
};

export const useOutcome = () => {
    const context = useContext(OutcomeContext);
    if (!context) throw new Error('useOutcome must be used within OutcomeProvider');
    return context;
};
