import React from 'react';
import { useLicense } from '@/contexts/LicenseContext';

export function LicenseSection() {
    const { status, activate, deactivate, displaySubscriptionStatus, displayLicenseStatus } = useLicense();
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                    <p className="text-sm font-bold text-app-text-muted">ステータス</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-3 h-3 rounded-full ${status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-lg font-bold text-white">{getStatusLabel(status)}</span>
                    </div>

                    {/* Current License Key Display */}
                    {status === 'ACTIVE' && typeof window !== 'undefined' && (
                        <div className="mt-3">
                            <p className="text-xs font-bold text-app-text-muted mb-1">現在のライセンスキー:</p>
                            {(() => {
                                const currentKey = localStorage.getItem('merfox_license_key') || '';
                                if (currentKey === 'MER-DEV-0000') {
                                    return (
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-sm text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                                                MER-DEV-0000
                                            </code>
                                            <span className="text-xs text-yellow-400">(Developer Mode)</span>
                                        </div>
                                    );
                                }
                                return (
                                    <code className="font-mono text-sm text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                                        {currentKey || '(不明)'}
                                    </code>
                                );
                            })()}
                        </div>
                    )}
                </div>
                {status === 'ACTIVE' && (
                    <button
                        onClick={handleDeactivate}
                        disabled={busy}
                        className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors self-start sm:self-center"
                    >
                        解除する
                    </button>
                )}
            </div>

            {/* Status Messages */}
            {displaySubscriptionStatus === 'expired' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    <p className="text-sm font-bold text-red-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        サブスクリプションの期限が切れています。更新してください。
                    </p>
                </div>
            )}

            {displayLicenseStatus === 'suspended' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    <p className="text-sm font-bold text-red-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        ライセンスは現在停止中です。サポートへお問い合わせください。
                    </p>
                </div>
            )}

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
