import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Container } from '@/components/ui/Container';
import { TYPOGRAPHY_H1, TYPOGRAPHY_H1_SUB } from '@/constants/designTokens';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Copy, RefreshCw, CheckCircle } from 'lucide-react';

export default function Diagnostics() {
    const [info, setInfo] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchDiagnostics = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/diagnostics').then(r => r.ok ? r.json() : { error: r.statusText }),
            fetch('/api/version').then(r => r.ok ? r.json() : { error: r.statusText }),
            fetch('/api/health').then(r => r.ok ? r.json() : { error: r.statusText }),
        ]).then(([diag, ver, health]) => {
            setInfo({
                ...diag,
                version: ver,
                health,
                localStorage: typeof window !== 'undefined' ? {
                    license: localStorage.getItem('merfox_license_key'),
                    lastVersion: localStorage.getItem('merfox_last_version')
                } : null,
                timestamp: new Date().toISOString()
            });
            setLoading(false);
        }).catch(err => {
            setInfo({ error: err.message });
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchDiagnostics();
    }, []);

    const handleCopy = () => {
        if (info) {
            navigator.clipboard.writeText(JSON.stringify(info, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-app-base text-white">
            <Container>
                <header className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`${TYPOGRAPHY_H1} text-white`}>診断情報</h1>
                            <p className={`${TYPOGRAPHY_H1_SUB} mt-2`}>
                                問題が発生した場合、この情報をスクリーンショットまたはコピーしてサポートに送信してください
                            </p>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-12 text-app-text-muted">
                        診断情報を収集中...
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Card className="bg-app-surface border border-app-border p-6 rounded-xl">
                            <pre className="text-xs overflow-auto text-white whitespace-pre-wrap font-mono">
                                {JSON.stringify(info, null, 2)}
                            </pre>
                        </Card>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleCopy}
                                className="flex items-center gap-2 bg-primary hover:bg-blue-600"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        コピーしました
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        クリップボードにコピー
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={fetchDiagnostics}
                                className="flex items-center gap-2 bg-app-element hover:bg-gray-700 text-white"
                            >
                                <RefreshCw className="w-4 h-4" />
                                再読み込み
                            </Button>
                        </div>
                    </div>
                )}
            </Container>
        </div>
    );
}

Diagnostics.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
