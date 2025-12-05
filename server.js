import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { fetchLarkRecords, createLarkRecords } from './larkService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Rate Limiters
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

const geocodeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 requests per windowMs
    message: { error: 'Too many geocoding requests, please slow down.' }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Smart Route Backend is running' });
});

// Lark API Proxy
app.get('/api/lark/orders', async (req, res) => {
    try {
        const { baseId, tableId } = req.query;
        const targetBaseId = baseId || process.env.LARK_BASE_ID;
        const targetTableId = tableId || process.env.LARK_TABLE_ID;

        if (!targetBaseId || !targetTableId) {
            return res.status(400).json({ error: 'Missing Base ID or Table ID' });
        }

        const records = await fetchLarkRecords(targetBaseId, targetTableId);
        res.json({ data: records });
    } catch (error) {
        console.error('Error fetching orders:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/lark/routes', async (req, res) => {
    try {
        const { baseId, tableId, routes } = req.body;
        const targetBaseId = baseId || process.env.LARK_BASE_ID;
        // For routes, we might need a different table ID, or pass it in
        const targetTableId = tableId || process.env.LARK_ROUTES_TABLE_ID;

        if (!targetBaseId || !targetTableId) {
            return res.status(400).json({ error: 'Missing Base ID or Table ID' });
        }

        if (!routes || !Array.isArray(routes)) {
            return res.status(400).json({ error: 'Invalid routes data' });
        }

        // Transform routes to Lark record format if needed
        // Mapping example: { "Route Name": r.name, "Driver": r.driverName, ... }
        const records = routes.map(r => ({
            "Route Name": r.name,
            "Driver": r.driverName || 'Unassigned',
            "Total Distance": r.totalDistanceKm,
            "Stop Count": r.orders.length,
            "Stops": JSON.stringify(r.orders.map(o => o.address)) // Lark Text field
        }));

        const result = await createLarkRecords(targetBaseId, targetTableId, records);
        res.json({ success: true, count: result.length });
    } catch (error) {
        console.error('Error syncing routes:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Track Asia VRP Proxy
app.post('/api/vrp/optimize', apiLimiter, async (req, res) => {
    try {
        // Input Validation
        if (!req.body.jobs || !Array.isArray(req.body.jobs)) {
            return res.status(400).json({ error: "Invalid payload: 'jobs' array is required" });
        }

        const apiKey = req.headers['x-track-asia-key'] || process.env.TRACK_ASIA_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        const response = await fetch(`https://maps.track-asia.com/api/v1/vrp?key=${apiKey}`, {
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
        res.status(500).json({ error: error.message });
    }
});

// Track Asia Geocoding Proxy
app.get('/api/vrp/geocode', geocodeLimiter, async (req, res) => {
    try {
        const { text } = req.query;
        const apiKey = req.headers['x-track-asia-key'] || process.env.TRACK_ASIA_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        if (!text) {
            return res.status(400).json({ error: 'Missing address text' });
        }

        const url = `https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(text)}&key=${apiKey}&lang=vi`;
        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Geocoding Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Catch-all handler for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
