import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const KIOTVIET_TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const KIOTVIET_API_BASE = 'https://public.kiotapi.com';

let cachedToken = null;
let tokenExpiry = 0;

export const getKiotVietToken = async (clientId, clientSecret) => {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await axios.post(KIOTVIET_TOKEN_URL,
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
                scope: 'PublicApi.Access'
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        cachedToken = response.data.access_token;
        // Token valid for ~24h, expire 5 min early
        tokenExpiry = now + (response.data.expires_in * 1000) - 300000;
        return cachedToken;
    } catch (error) {
        console.error('KiotViet Auth Error:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with KiotViet');
    }
};

export const fetchKiotVietOrders = async (clientId, clientSecret, retailer, options = {}) => {
    try {
        const token = await getKiotVietToken(clientId, clientSecret);

        const params = {
            pageSize: options.pageSize || 50,
            currentItem: options.currentItem || 0,
            orderDirection: 'Desc',
            ...(options.status !== undefined && { status: options.status }),
            ...(options.lastModifiedFrom && { lastModifiedFrom: options.lastModifiedFrom })
        };

        const response = await axios.get(`${KIOTVIET_API_BASE}/orders`, {
            headers: {
                'Retailer': retailer,
                'Authorization': `Bearer ${token}`
            },
            params
        });

        if (response.data && Array.isArray(response.data.data)) {
            return response.data.data.map(order => ({
                id: String(order.id || order.code),
                customerName: order.customerName || 'Unknown',
                phoneNumber: order.contactNumber || '',
                address: order.orderDelivery?.address || order.address || '',
                cod: order.usingCod ? (order.totalPayment || order.total || 0) : 0,
                status: order.statusValue || String(order.status || 'New'),
                note: order.description || ''
            }));
        }

        return [];
    } catch (error) {
        console.error('KiotViet Orders Error:', error.response?.data || error.message);
        throw new Error('Failed to fetch KiotViet orders: ' + (error.response?.data?.responseStatus?.message || error.message));
    }
};
