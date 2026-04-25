/**
 * Drop-in replacement for fetch() for all /api/* calls.
 * In Electron, cookies set via document.cookie are not always forwarded to the
 * embedded Next.js server. This helper adds:
 *   1. credentials: 'include'  — asks Chromium to attach cookies
 *   2. Authorization: Bearer   — fallback from localStorage so API always gets a token
 */
export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof localStorage !== 'undefined'
        ? localStorage.getItem('merfox_lease_token')
        : null;

    const baseHeaders: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    if (token && !baseHeaders['Authorization']) {
        baseHeaders['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: baseHeaders,
    });
}
