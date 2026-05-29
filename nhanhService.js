import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const NHANH_API_BASE = 'https://pos.open.nhanh.vn/v3.0';

export const fetchNhanhOrders = async (appId, businessId, accessToken, options = {}) => {
    try {
        if (!appId || !businessId || !accessToken) {
            throw new Error('Missing Nhanh.vn credentials (appId, businessId, accessToken)');
        }

        const url = `${NHANH_API_BASE}/order/list?appId=${appId}&businessId=${businessId}`;

        // Build request body
        const body = {};

        // Filters
        const filters = {};
        if (options.status) filters.status = options.status;
        if (options.createdAtFrom) filters.createdAtFrom = options.createdAtFrom;
        if (options.createdAtTo) filters.createdAtTo = options.createdAtTo;
        if (Object.keys(filters).length > 0) body.filters = filters;

        // Pagination
        body.paginator = {
            size: options.pageSize || 50,
            sort: { id: 'desc' }
        };
        if (options.next) body.paginator.next = options.next;

        const response = await axios.post(url, body, {
            headers: {
                'Authorization': accessToken,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;

        // Nhanh v3 returns { code: 1, data: { orders: [...] } } on success
        if (data && data.code === 1 && data.data) {
            const orders = data.data.orders || [];
            // orders can be an object keyed by ID or an array
            const orderList = Array.isArray(orders) ? orders : Object.values(orders);

            return orderList.map(order => ({
                id: String(order.id || order.code || ''),
                customerName: order.customerName || 'Unknown',
                phoneNumber: order.customerMobile || '',
                address: order.customerAddress || '',
                cod: parseFloat(order.codAmount || order.codFee || 0),
                status: order.status || 'New',
                note: order.privateDescription || order.description || ''
            }));
        }

        // Handle error response
        if (data && data.code !== 1) {
            throw new Error(data.messages || data.message || 'Nhanh.vn API error');
        }

        return [];
    } catch (error) {
        console.error('Nhanh.vn Orders Error:', error.response?.data || error.message);
        throw new Error('Failed to fetch Nhanh.vn orders: ' + (error.response?.data?.messages || error.message));
    }
};
