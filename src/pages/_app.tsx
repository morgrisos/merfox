import type { AppProps } from 'next/app';
import { LicenseProvider } from '@/contexts/LicenseContext';
import { NextPage } from 'next';
import { ScraperProvider } from '@/hooks/useScraper';
import { SettingsProvider } from '@/hooks/useSettings';
import { OutcomeProvider } from '@/contexts/OutcomeContext';
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

    return (
        <LicenseProvider>
            <SettingsProvider>
                <ScraperProvider>
                    <OutcomeProvider>
                        {getLayout(<Component {...pageProps} />)}
                    </OutcomeProvider>
                </ScraperProvider>
            </SettingsProvider>
        </LicenseProvider>
    );
}
