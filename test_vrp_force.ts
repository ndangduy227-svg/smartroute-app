
import { solveVRP } from './utils/vrpHelpers';

// Mock data
const mockOrders = [
    { id: 'O1', customerName: 'C1', address: 'A1', coordinates: { lat: 10.7769, lng: 106.7009 }, cod: 0 },
    { id: 'O2', customerName: 'C2', address: 'A2', coordinates: { lat: 10.7844, lng: 106.6843 }, cod: 0 },
    { id: 'O3', customerName: 'C3', address: 'A3', coordinates: { lat: 10.7578, lng: 106.7013 }, cod: 0 },
    { id: 'O4', customerName: 'C4', address: 'A4', coordinates: { lat: 10.7540, lng: 106.6634 }, cod: 0 },
    { id: 'O5', customerName: 'C5', address: 'A5', coordinates: { lat: 10.7481, lng: 106.6352 }, cod: 0 },
    { id: 'O6', customerName: 'C6', address: 'A6', coordinates: { lat: 10.7340, lng: 106.7130 }, cod: 0 },
];

const origin = { lat: 10.769034, lng: 106.694945 };
const apiKey = '6e3dbb141206003a34691764322663154b'; // Using key from existing test file

async function runTest() {
    console.log('--- Testing Normal VRP (might return multiple if maxOrdersPerShipper is low) ---');
    // Force split by setting low maxOrders
    const configNormal = {
        maxOrdersPerShipper: 2,
        costPerKm: 5000,
        startPoints: [],
        maxClusters: 5,
        currency: 'VND',
        maxKmPerShipper: 500,
        trackAsiaApiKey: apiKey
    };

    // We can't easily test "Normal" split behavior without a real API call that respects capacity strictly,
    // but we can test the "Force Single" behavior.

    console.log('--- Testing Force Single Vehicle VRP ---');
    const configForce = {
        maxOrdersPerShipper: 2, // Even with low capacity...
        costPerKm: 5000,
        startPoints: [],
        maxClusters: 5,
        currency: 'VND',
        maxKmPerShipper: 500,
        trackAsiaApiKey: apiKey,
        forceSingleVehicle: true // ...it should return 1 route (ignoring capacity or overloading it if API allows, or just 1 vehicle)
    };

    try {
        // Note: We are running this in node, so we need to ensure fetch is available or polyfilled if needed.
        // But since this is a TS file importing from utils, we might need to compile it or run with ts-node.
        // For simplicity, I will mock the fetch or just rely on the fact that I'm writing a test file 
        // that the user can run if they have the environment. 
        // Actually, I'll write a JS file that imports the compiled JS or just copies the logic for a standalone test.
        // Since I can't easily run TS, I'll rewrite this as a standalone JS test file.
        console.log("Please run the JS version of this test.");
    } catch (e) {
        console.error(e);
    }
}
