import type { AppProps } from 'next/app';
import { LicenseProvider } from '@/contexts/LicenseContext';
import { NextPage } from 'next';
import { ScraperProvider } from '@/hooks/useScraper';
import { SettingsProvider } from '@/hooks/useSettings';
import { OutcomeProvider } from '@/contexts/OutcomeContext';
import { TermsModal } from '@/components/onboarding/TermsModal';
import { useState, useEffect } from 'react';
import '@/index.css';

// Type for pages with getLayout
type NextPageWithLayout = NextPage & {
    getLayout?: (page: React.ReactElement) => React.ReactNode;
};

type AppPropsWithLayout = AppProps & {
    Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
    // Use the page defined layout (if available) or fallback to simple wrapper
    const getLayout = Component.getLayout ?? ((page) => page);

    // P0 Safety: Terms agreement check
    const [showTermsModal, setShowTermsModal] = useState(false);

    useEffect(() => {
        // Check if user has agreed to terms
        const agreed = localStorage.getItem('merfox_terms_v1');
        if (!agreed) {
            setShowTermsModal(true);
        }
    }, []);

    const handleAgree = () => {
        localStorage.setItem('merfox_terms_v1', 'agreed');
        setShowTermsModal(false);
    };

    return (
        <LicenseProvider>
            <SettingsProvider>
                <ScraperProvider>
                    <OutcomeProvider>
                        <TermsModal isOpen={showTermsModal} onAgree={handleAgree} />
                        {getLayout(<Component {...pageProps} />)}
                    </OutcomeProvider>
                </ScraperProvider>
            </SettingsProvider>
        </LicenseProvider>
    );
}
