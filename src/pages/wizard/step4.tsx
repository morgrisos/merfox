import React from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { AppShell } from '@/components/layout/AppShell';
import { MappingEditor } from '@/components/mapping/MappingEditor';
import { useOutcome } from '@/contexts/OutcomeContext';

export default function Step4_Mapping() {
    const { outcome } = useOutcome();
    const { query } = useRouter();
    // URL query runId takes priority (direct navigation from dashboard) over OutcomeContext (wizard flow)
    const latestRunId = (query.runId as string) || (outcome as any).latestRunId;

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <Card className="max-w-5xl w-full border border-app-border bg-app-surface shadow-none space-y-6 p-6 text-white rounded-lg">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-white">ASIN設定</h1>
                    <p className="text-app-text-muted text-sm">各商品にAmazon ASINを紐付けてください。設定後、下のボタンで次のステップへ進みます。</p>
                </div>

                <div className="border border-app-border rounded-lg overflow-hidden h-[600px] flex flex-col bg-app-base">
                    <MappingEditor runId={latestRunId} mode="wizard" />
                </div>
            </Card>
        </div>
    );
}

Step4_Mapping.getLayout = (page: React.ReactElement) => <AppShell variant="wizard">{page}</AppShell>;
