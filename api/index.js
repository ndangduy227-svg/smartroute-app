import express from 'express';
import dotenv from 'dotenv';
import { fetchLarkRecords, createLarkRecords } from '../larkService.js';

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

// Export the app for Vercel
export default app;
