/**
 * [P3-3] LOW-01: Shared error-to-Japanese message converter.
 * Previously duplicated in BlockingScreen.tsx and LicenseSection.tsx.
 * Single source of truth — update here to affect both.
 */
export function toUserMessage(raw?: string): string {
    if (!raw) return 'ライセンスの確認に失敗しました。もう一度キーを入力してください。';
    const r = raw.toLowerCase();

    // ネットワーク系（最優先 — サーバー到達前の失敗）
    if (r.includes('network') || r.includes('fetch') || r.includes('timeout') || r.includes('unreachable')) {
        return 'ライセンスサーバーに接続できません。インターネット接続を確認して、もう一度試してください。';
    }

    // キーが存在しない
    if (r.includes('not found')) {
        return 'ライセンスキーが見つかりません。入力内容をご確認ください（例: MER-XXXX-XXXX）。';
    }

    // サブスク期限切れ
    if (r.includes('subscription') && (r.includes('expired') || r.includes('invalid'))) {
        return 'サブスクリプションの有効期限が切れています。プランを更新してください。';
    }
    if (r.includes('expir')) {
        return 'ライセンスの有効期限が切れています。サブスクリプションをご確認ください。';
    }

    // 別端末使用中（最終ブロック）— reactivateも失敗した場合
    if (r.includes('device mismatch') || (r.includes('another device') && r.includes('active'))) {
        return '別の端末でこのライセンスが使用中です。元の端末でアプリを解除してから再度お試しください。';
    }

    // トークン無効（reactivate失敗）
    if (r.includes('token invalid') && r.includes('reactivation')) {
        return 'セッション情報が無効です。アプリを再起動してキーを再入力してください。';
    }

    // 停止・無効化
    if (r.includes('suspend') || r.includes('inactive')) {
        return 'このライセンスは無効化されています。ご不明な場合はサポートへお問い合わせください。';
    }

    // トークン期限切れ（leaseToken invalid）
    if (r.includes('token') && (r.includes('invalid') || r.includes('expired'))) {
        return 'セッションが期限切れになりました。もう一度キーを入力して再認証してください。';
    }

    // サブスク確認失敗（汎用）
    if (r.includes('subscription')) {
        return 'サブスクリプションを確認できません。もう一度試してください。';
    }

    // その他の認証失敗
    if (r.includes('invalid')) {
        return 'ライセンスキーの形式が正しくありません。キーを確認してください（例: MER-XXXX-XXXX）。';
    }

    return 'ライセンスの確認に失敗しました。もう一度キーを入力してください。';
}
