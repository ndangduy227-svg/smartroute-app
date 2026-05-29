import { auth } from '../firebase';

let userTrackAsiaKey: string | null = null;

export function setUserTrackAsiaKey(key: string | null) {
    userTrackAsiaKey = key;
}

export function getUserTrackAsiaKey(): string | null {
    return userTrackAsiaKey;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const token = await user.getIdToken();

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    // Auto-inject user's TrackAsia key for VRP/geocoding endpoints
    if (userTrackAsiaKey && url.includes('/api/vrp/')) {
        headers.set('X-TrackAsia-Key', userTrackAsiaKey);
    }

    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
}
