import React from 'react';
import { ShieldCheck, Ban } from 'lucide-react';
import { useLicense } from '@/contexts/LicenseContext';
import { useRouter } from 'next/router';

export function BlockingScreen() {
    const { status, activate } = useLicense();
    const router = useRouter();
    const [key, setKey] = React.useState('');
    const [msg, setMsg] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const handleActivate = async () => {
        setSubmitting(true);
        const res = await activate(key);
        setSubmitting(false);
        if (res.success) {
            // Auto reload or let the parent re-render
        } else {
            setMsg(res.message || 'Error');
        }
    };

    // If grace period, allow bypass? No, this screen is for BLOCKED state.
    // Grace period is handled by LicenseGate allowing access.

    // If status is UNAUTHENTICATED, show simple input.
    // If SUSPENDED/expired, show specific message.

    const title = getTitle(status);
    const desc = getDesc(status);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111418] text-white p-6">
            <div className="max-w-md w-full bg-[#1a2027] border border-[#282f39] rounded-xl p-8 text-center shadow-2xl">
                <div className="mb-6 flex justify-center">
                    <div className={`p-4 rounded-full ${status === 'SUSPENDED' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                        {status === 'SUSPENDED' ? <Ban className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-2">{title}</h1>
                <p className="text-gray-400 mb-8 text-sm">{desc}</p>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="ライセンスキーを入力 (例: MER-XXXX)"
                        className="w-full h-12 px-4 rounded-lg bg-[#0d1116] border border-[#282f39] text-white focus:border-blue-500 focus:outline-none transition-colors text-center font-mono tracking-wider"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                    />

                    {msg && <p className="text-red-400 text-xs font-bold">{msg}</p>}

                    <button
                        onClick={handleActivate}
                        disabled={submitting || !key}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20"
                    >
                        {submitting ? '認証中...' : 'ライセンス認証する'}
                    </button>

                    <div className="pt-4 border-t border-[#282f39] mt-4">
                        <button onClick={() => router.push('/dashboard')} className="text-xs text-gray-500 hover:text-white">
                            ダッシュボードに戻る (機能制限あり)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getTitle(status: string) {
    switch (status) {
        case 'SUSPENDED': return 'ライセンスが停止されています';
        case 'EXPIRED': return '有効期限切れです';
        case 'DEVICE_LIMIT': return '端末数上限に達しています';
        case 'OFFLINE_GRACE': return 'オフライン猶予期間です'; // Should not see block screen usually
        default: return 'ライセンス認証が必要です';
    }
}

function getDesc(status: string) {
    if (status === 'SUSPENDED') return 'お支払いの問題等により利用が停止されています。サポートまでお問い合わせください。';
    if (status === 'DEVICE_LIMIT') return '他の端末でライセンスが使用されています。元の端末で解除するか、追加ライセンスを購入してください。';
    return 'この機能を利用するには、有効なライセンスキーによる認証が必要です。';
}
