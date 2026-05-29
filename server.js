import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { fetchLarkRecords, createLarkRecords } from './larkService.js';
import { fetchPoscakeOrders } from './poscakeService.js';
import { fetchKiotVietOrders } from './kiotvietService.js';
import { fetchNhanhOrders } from './nhanhService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Rate Limiters
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many requests, please try again later.' }
});

const geocodeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many geocoding requests, please slow down.' }
});

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

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

const isValidId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);

// --- Routes ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Smart Route Backend is running' });
});

app.get('/api/lark/orders', verifyAuth, apiLimiter, async (req, res) => {
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

app.post('/api/lark/routes', verifyAuth, apiLimiter, async (req, res) => {
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

app.post('/api/poscake/orders', verifyAuth, apiLimiter, async (req, res) => {
    try {
        const { shopId, token } = req.body;
        const orders = await fetchPoscakeOrders(shopId, token);
        res.json({ data: orders });
    } catch (error) {
        console.error('Error fetching POSCake orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/api/poscake/orders', verifyAuth, apiLimiter, async (req, res) => {
    try {
        const { shopId, token } = req.query;
        const orders = await fetchPoscakeOrders(shopId, token);
        res.json({ data: orders });
    } catch (error) {
        console.error('Error fetching POSCake orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// --- Helper: resolve effective TrackAsia key ---
const getEffectiveKey = (req) => {
    const userKey = req.headers['x-trackasia-key'];
    if (userKey && typeof userKey === 'string' && userKey.length > 10 && userKey.length < 200) {
        return userKey;
    }
    return TRACK_ASIA_API_KEY;
};

// Test TrackAsia API Key
app.post('/api/vrp/test-key', verifyAuth, apiLimiter, async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 200) {
            return res.status(400).json({ valid: false, error: 'Invalid API key format' });
        }

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

app.post('/api/vrp/optimize', verifyAuth, apiLimiter, async (req, res) => {
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

app.get('/api/vrp/geocode', verifyAuth, geocodeLimiter, async (req, res) => {
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
app.post('/api/kiotviet/orders', verifyAuth, apiLimiter, async (req, res) => {
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
app.post('/api/nhanh/orders', verifyAuth, apiLimiter, async (req, res) => {
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

// Catch-all handler for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
