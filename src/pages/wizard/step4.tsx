import React from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { MappingEditor } from '@/components/mapping/MappingEditor';

export default function Step4_Mapping() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <Card className="max-w-4xl w-full border border-app-border bg-app-surface shadow-none space-y-6 p-6 text-white rounded-lg">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-white">カテゴリ変換設定</h1>
                    <p className="text-app-text-muted text-sm">メルカリのカテゴリーをAmazonのASINコードに関連付けます。</p>
                </div>

                <div className="border border-app-border rounded-lg overflow-hidden h-[500px] flex flex-col">
                    <MappingEditor />
                </div>

                <Button
                    size="lg"
                    className="w-full text-base h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-none font-bold"
                    onClick={() => router.push('/wizard/step5')}
                >
                    次へ：Amazon TSVへ変換 <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </Card>
        </div>
    );
}

Step4_Mapping.getLayout = (page: React.ReactElement) => <AppShell variant="wizard">{page}</AppShell>;
