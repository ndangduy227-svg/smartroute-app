import { auth } from '../firebase';

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const token = await user.getIdToken();

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
}
