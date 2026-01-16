'use client';

import { SettingsProvider } from '@/hooks/useSettings';
import { ScraperProvider } from '@/hooks/useScraper';
import { MainLayout } from '@/layout/MainLayout';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <SettingsProvider>
            <ScraperProvider>
                <MainLayout>{children}</MainLayout>
                <OnboardingModal />
            </ScraperProvider>
        </SettingsProvider>
    );
}
