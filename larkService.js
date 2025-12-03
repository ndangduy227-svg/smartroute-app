import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

let cachedToken = null;
let tokenExpiry = 0;

export const getTenantAccessToken = async () => {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await axios.post(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
            app_id: process.env.LARK_APP_ID,
            app_secret: process.env.LARK_APP_SECRET
        });

        if (response.data.code === 0) {
            cachedToken = response.data.tenant_access_token;
            // Expire 5 minutes early to be safe
            tokenExpiry = now + (response.data.expire * 1000) - 300000;
            return cachedToken;
        } else {
            throw new Error(`Lark Auth Error: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('Failed to get Lark access token:', error.message);
        throw error;
    }
};

export const fetchLarkRecords = async (appToken, tableId) => {
    const token = await getTenantAccessToken();
    try {
        const response = await axios.get(`${LARK_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.code === 0) {
            return response.data.data.items;
        } else {
            throw new Error(`Lark API Error: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('Failed to fetch Lark records:', error.message);
        throw error;
    }
};

export const createLarkRecords = async (appToken, tableId, records) => {
    const token = await getTenantAccessToken();
    try {
        // Lark allows creating up to 100 records per batch
        // We'll assume records is an array of fields objects
        const response = await axios.post(`${LARK_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`, {
            records: records.map(fields => ({ fields }))
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.code === 0) {
            return response.data.data.records;
        } else {
            throw new Error(`Lark API Error: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('Failed to create Lark records:', error.message);
        throw error;
    }
};
