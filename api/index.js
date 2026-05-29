import express from 'express';
import dotenv from 'dotenv';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { fetchLarkRecords, createLarkRecords } from '../larkService.js';
import { fetchPoscakeOrders } from '../poscakeService.js';
import { fetchKiotVietOrders } from '../kiotvietService.js';
import { fetchNhanhOrders } from '../nhanhService.js';

dotenv.config();

const app = express();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const TRACK_ASIA_API_KEY = process.env.TRACK_ASIA_API_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',');

// --- CORS ---
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TrackAsia-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json({ limit: '1mb' }));

// --- Firebase Auth Middleware ---
const JWKS = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const verifyAuth = async (req, res, next) => {
    if (!FIREBASE_PROJECT_ID) {
        console.error('FIREBASE_PROJECT_ID not configured');
        return res.status(500).json({ error: 'Server auth not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        });
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// --- Simple Rate Limiter (per-IP, in-memory) ---
const rateLimitStore = new Map();

const rateLimit = (maxRequests, windowMs) => (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const now = Date.now();
    const key = `${req.path}:${ip}`;

    const entry = rateLimitStore.get(key);
    if (entry && now - entry.start < windowMs) {
        if (entry.count >= maxRequests) {
            return res.status(429).json({ error: 'Too many requests, please try again later' });
        }
        entry.count++;
    } else {
        rateLimitStore.set(key, { start: now, count: 1 });
    }

    // Cleanup old entries periodically
    if (rateLimitStore.size > 10000) {
        for (const [k, v] of rateLimitStore) {
            if (now - v.start > windowMs * 2) rateLimitStore.delete(k);
        }
    }

    next();
};

// --- Input Validation Helpers ---
const isValidId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);

// --- Health Check (no auth required) ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// --- Protected Routes ---

// Lark API Proxy
app.get('/api/lark/orders', verifyAuth, rateLimit(30, 60000), async (req, res) => {
    try {
        const { baseId, tableId } = req.query;
        const targetBaseId = baseId || process.env.LARK_BASE_ID;
        const targetTableId = tableId || process.env.LARK_TABLE_ID;

        if (!targetBaseId || !targetTableId) {
            return res.status(400).json({ error: 'Missing Base ID or Table ID' });
        }
        if ((baseId && !isValidId(baseId)) || (tableId && !isValidId(tableId))) {
            return res.status(400).json({ error: 'Invalid Base ID or Table ID format' });
        }

        const records = await fetchLarkRecords(targetBaseId, targetTableId);
        res.json({ data: records });
    } catch (error) {
        console.error('Error fetching orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.post('/api/lark/routes', verifyAuth, rateLimit(10, 60000), async (req, res) => {
    try {
        const { baseId, tableId, routes } = req.body;
        const targetBaseId = baseId || process.env.LARK_BASE_ID;
        const targetTableId = tableId || process.env.LARK_ROUTES_TABLE_ID;

        if (!targetBaseId || !targetTableId) {
            return res.status(400).json({ error: 'Missing Base ID or Table ID' });
        }
        if (!routes || !Array.isArray(routes)) {
            return res.status(400).json({ error: 'Invalid routes data' });
        }

        const records = routes.map(r => ({
            "Route Name": r.name,
            "Driver": r.driverName || 'Unassigned',
            "Total Distance": String(r.totalDistanceKm),
            "Stop Count": String(r.orders.length),
            "Stops": JSON.stringify(r.orders.map(o => o.address))
        }));

        const result = await createLarkRecords(targetBaseId, targetTableId, records);
        res.json({ success: true, count: result.length });
    } catch (error) {
        console.error('Error syncing routes:', error.message);
        res.status(500).json({ error: 'Failed to sync routes' });
    }
});

// POSCake API Proxy (changed to POST to avoid API key in URL)
app.post('/api/poscake/orders', verifyAuth, rateLimit(10, 60000), async (req, res) => {
    try {
        const { shopId, token } = req.body;
        const orders = await fetchPoscakeOrders(shopId, token);
        res.json({ data: orders });
    } catch (error) {
        console.error('Error fetching POSCake orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Keep GET for backwards compatibility but require auth
app.get('/api/poscake/orders', verifyAuth, rateLimit(10, 60000), async (req, res) => {
    try {
        const { shopId, token } = req.query;
        const orders = await fetchPoscakeOrders(shopId, token);
        res.json({ data: orders });
    } catch (error) {
        console.error('Error fetching POSCake orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// --- Helper: resolve effective TrackAsia key (user's or server default) ---
const getEffectiveKey = (req) => {
    const userKey = req.headers['x-trackasia-key'];
    if (userKey && typeof userKey === 'string' && userKey.length > 10 && userKey.length < 200) {
        return userKey;
    }
    return TRACK_ASIA_API_KEY;
};

// Test TrackAsia API Key
app.post('/api/vrp/test-key', verifyAuth, rateLimit(5, 60000), async (req, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 200) {
            return res.status(400).json({ valid: false, error: 'Invalid API key format' });
        }

        // Test with a simple geocode request
        const testUrl = `https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent('Ho Chi Minh City')}&key=${apiKey}&lang=vi`;
        const response = await fetch(testUrl);

        if (response.ok) {
            const data = await response.json();
            if (data && (data.features || data.type)) {
                return res.json({ valid: true });
            }
        }

        return res.json({ valid: false, error: 'API key is not valid or has no access' });
    } catch (error) {
        console.error('Key test error:', error.message);
        res.json({ valid: false, error: 'Failed to validate key' });
    }
});

// Track Asia VRP Proxy - supports user key via X-TrackAsia-Key header
app.post('/api/vrp/optimize', verifyAuth, rateLimit(20, 60000), async (req, res) => {
    try {
        if (!req.body.jobs || !Array.isArray(req.body.jobs)) {
            return res.status(400).json({ error: "Invalid payload: 'jobs' array is required" });
        }

        const effectiveKey = getEffectiveKey(req);
        if (!effectiveKey) {
            return res.status(500).json({ error: 'No API key available. Please configure your TrackAsia API key in Settings.' });
        }

        const response = await fetch(`https://maps.track-asia.com/api/v1/vrp?key=${effectiveKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'VRP API Error');
        }
        res.json(data);
    } catch (error) {
        console.error('VRP Proxy Error:', error.message);
        res.status(500).json({ error: 'Route optimization failed' });
    }
});

// Track Asia Geocoding Proxy - supports user key via X-TrackAsia-Key header
app.get('/api/vrp/geocode', verifyAuth, rateLimit(60, 60000), async (req, res) => {
    try {
        const { text } = req.query;

        const effectiveKey = getEffectiveKey(req);
        if (!effectiveKey) {
            return res.status(500).json({ error: 'No API key available. Please configure your TrackAsia API key in Settings.' });
        }
        if (!text || typeof text !== 'string' || text.length > 500) {
            return res.status(400).json({ error: 'Invalid address text' });
        }

        const url = `https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(text)}&key=${effectiveKey}&lang=vi`;
        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Geocoding Proxy Error:', error.message);
        res.status(500).json({ error: 'Geocoding failed' });
    }
});

// KiotViet API Proxy
app.post('/api/kiotviet/orders', verifyAuth, rateLimit(10, 60000), async (req, res) => {
    try {
        const { clientId, clientSecret, retailer } = req.body;
        if (!clientId || !clientSecret || !retailer) {
            return res.status(400).json({ error: 'Missing KiotViet credentials (clientId, clientSecret, retailer)' });
        }

        const orders = await fetchKiotVietOrders(clientId, clientSecret, retailer);
        res.json({ data: orders });
    } catch (error) {
        console.error('KiotViet Proxy Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to fetch KiotViet orders' });
    }
});

// Nhanh.vn API Proxy
app.post('/api/nhanh/orders', verifyAuth, rateLimit(10, 60000), async (req, res) => {
    try {
        const { appId, businessId, accessToken } = req.body;
        if (!appId || !businessId || !accessToken) {
            return res.status(400).json({ error: 'Missing Nhanh.vn credentials (appId, businessId, accessToken)' });
        }

        const orders = await fetchNhanhOrders(appId, businessId, accessToken);
        res.json({ data: orders });
    } catch (error) {
        console.error('Nhanh.vn Proxy Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to fetch Nhanh.vn orders' });
    }
});

export default app;
