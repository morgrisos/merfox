import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/AppProviders';

export const metadata: Metadata = {
    title: 'MerFox v1.0',
    description: 'Mercari to Amazon Cross-Listing Tool',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <body>
                <AppProviders>
                    {children}
                </AppProviders>
            </body>
        </html>
    );
}
