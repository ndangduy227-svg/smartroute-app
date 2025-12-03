import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const POSCAKE_API_BASE = 'https://pos.pages.fm/api/v1';



export const fetchPoscakeOrders = async (shopId, accessToken) => {
    try {
        // Default to env vars if not provided
        const targetShopId = shopId || process.env.POSCAKE_SHOP_ID;
        const token = accessToken || process.env.POSCAKE_API_KEY;

        if (!targetShopId || !token) {
            throw new Error('Missing POSCake Shop ID or API Key');
        }

        // Fetch orders from POSCake
        // Documentation: GET /shops/{SHOP_ID}/orders
        // Research indicates 'api_key' is the common param for Pancake POS
        const response = await axios.get(`${POSCAKE_API_BASE}/shops/${targetShopId}/orders`, {
            params: {
                api_key: token,
                page_size: 50, // Fetch up to 50 orders
                page_number: 1
            }
        });

        if (response.data.success) {
            // Transform POSCake orders to Smart Route format
            // POSCake Order Structure:
            // {
            //   id: 1418,
            //   bill_full_name: "Hoang Anh",
            //   shipping_address: { full_address: "..." },
            //   items: [ ... ]
            // }

            return response.data.data.map(order => ({
                id: String(order.id),
                customerName: order.bill_full_name || 'Unknown Customer',
                address: order.shipping_address?.full_address || order.shipping_address?.address || 'No Address',
                weight: order.total_weight || 1, // Default weight if missing
                cod: order.cod || 0,
                status: order.status_name || 'New'
            }));
        } else {
            console.error('POSCake API Failed Response:', response.data);
            throw new Error(response.data.message || 'Failed to fetch orders from POSCake (Success=false)');
        }
    } catch (error) {
        console.error('POSCake API Error:', error.message);
        if (error.response) {
            console.error('POSCake API Error Data:', error.response.data);
            throw new Error(error.response.data?.message || `API Error: ${error.response.status} ${error.response.statusText}`);
        }
        throw error;
    }
};
