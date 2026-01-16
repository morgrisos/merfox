'use client';

import { SettingsProvider } from '@/hooks/useSettings';
import { ScraperProvider } from '@/hooks/useScraper';
import { AppErrorProvider } from '@/contexts/AppErrorContext';
import { MainLayout } from '@/layout/MainLayout';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { AppErrorModal } from '@/components/errors/AppErrorModal';

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AppErrorProvider>
            <SettingsProvider>
                <ScraperProvider>
                    <MainLayout>{children}</MainLayout>
                    <OnboardingModal />
                    <AppErrorModal />
                </ScraperProvider>
            </SettingsProvider>
        </AppErrorProvider>
    );
}
