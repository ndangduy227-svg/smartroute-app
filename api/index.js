import express from 'express';
import dotenv from 'dotenv';
import { fetchLarkRecords, createLarkRecords } from '../larkService.js';
import { fetchPoscakeOrders } from '../poscakeService.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
    console.log('Health check called');
    res.json({ status: 'ok', message: 'Smart Route Backend is running (Serverless)' });
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
            "Total Distance": String(r.totalDistanceKm), // Ensure string for Text field
            "Stop Count": String(r.orders.length),       // Ensure string for Text field
            "Stops": JSON.stringify(r.orders.map(o => o.address))
        }));

        const result = await createLarkRecords(targetBaseId, targetTableId, records);
        res.json({ success: true, count: result.length });
    } catch (error) {
        console.error('Error syncing routes:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POSCake API Proxy
app.get('/api/poscake/orders', async (req, res) => {
    try {
        const { shopId, token } = req.query;
        // Use query params if provided, otherwise fallback to env vars in service
        const orders = await fetchPoscakeOrders(shopId, token);
        res.json({ data: orders });
    } catch (error) {
        console.error('Error fetching POSCake orders:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Track Asia VRP Proxy
app.post('/api/vrp/optimize', async (req, res) => {
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
app.get('/api/vrp/geocode', async (req, res) => {
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

// Export the app for Vercel
export default app;
