import React from 'react';
import { useLicense } from '@/contexts/LicenseContext';

export function LicenseSection() {
    const { status, activate, deactivate } = useLicense();
    const [keyInput, setKeyInput] = React.useState('');
    const [msg, setMsg] = React.useState('');
    const [busy, setBusy] = React.useState(false);

    const handleActivate = async () => {
        setBusy(true);
        const res = await activate(keyInput);
        setBusy(false);
        if (res.success) {
            setMsg('認証に成功しました');
            setKeyInput('');
        } else {
            setMsg(res.message || '認証失敗');
        }
    };

    const handleDeactivate = async () => {
        if (!confirm('ライセンス認証を解除しますか？\nこの端末では機能が利用できなくなります。')) return;
        setBusy(true);
        await deactivate();
        setBusy(false);
    };

    return (
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">ライセンス認証</h2>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-sm font-bold text-app-text-muted">ステータス</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-3 h-3 rounded-full ${status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-lg font-bold text-white">{getStatusLabel(status)}</span>
                    </div>
                </div>
                {status === 'ACTIVE' && (
                    <button
                        onClick={handleDeactivate}
                        disabled={busy}
                        className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors"
                    >
                        解除する
                    </button>
                )}
            </div>

            {status !== 'ACTIVE' && status !== 'OFFLINE_GRACE' && (
                <div className="bg-app-element rounded-lg p-4 mb-4">
                    <label className="text-sm font-bold text-app-text-muted block mb-2">ライセンスキーを入力</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-app-base border border-app-border rounded-lg px-4 py-2 text-white focus:border-primary outline-none"
                            placeholder="MER-XXXX-XXXX"
                            value={keyInput}
                            onChange={e => setKeyInput(e.target.value)}
                        />
                        <button
                            onClick={handleActivate}
                            disabled={!keyInput || busy}
                            className="px-6 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                        >
                            認証
                        </button>
                    </div>
                    {msg && <p className={`text-xs font-bold mt-2 ${msg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
                </div>
            )}

            <div className="text-xs text-app-text-muted leading-relaxed">
                <p>※ ライセンスは1つのキーにつき1端末まで利用可能です。</p>
                <p>※ 別の端末で利用する場合は、現在の端末で「解除」を行ってください。</p>
            </div>
        </div>
    );
}

function getStatusLabel(s: string) {
    if (s === 'ACTIVE') return '有効 (Active)';
    if (s === 'UNAUTHENTICATED') return '未認証';
    if (s === 'OFFLINE_GRACE') return 'オフライン (猶予期間)';
    return s;
}
