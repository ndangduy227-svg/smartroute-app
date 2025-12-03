import { Order, Cluster, Coordinate, RouteConfig } from '../types';

// --- CONSTANTS ---
export const DISTRICT_LOCATIONS: { [key: string]: Coordinate } = {
    '1': { lat: 10.7756, lng: 106.7004 },
    '3': { lat: 10.7844, lng: 106.6843 },
    '4': { lat: 10.7578, lng: 106.7013 },
    '5': { lat: 10.7540, lng: 106.6634 },
    '6': { lat: 10.7481, lng: 106.6352 },
    '7': { lat: 10.7340, lng: 106.7130 },
    '8': { lat: 10.7241, lng: 106.6286 },
    '10': { lat: 10.7746, lng: 106.6669 },
    '11': { lat: 10.7629, lng: 106.6502 },
    '12': { lat: 10.8672, lng: 106.6411 },
    'binh thanh': { lat: 10.8106, lng: 106.7091 },
    'thu duc': { lat: 10.8494, lng: 106.7537 },
    'go vap': { lat: 10.8387, lng: 106.6653 },
    'phu nhuan': { lat: 10.7992, lng: 106.6805 },
    'tan binh': { lat: 10.8015, lng: 106.6523 },
    'tan phu': { lat: 10.7901, lng: 106.6281 },
    'binh tan': { lat: 10.7652, lng: 106.6038 },
    'binh chanh': { lat: 10.6874, lng: 106.5911 },
    'nha be': { lat: 10.6952, lng: 106.7048 },
    'hoc mon': { lat: 10.8863, lng: 106.5921 },
    'cu chi': { lat: 11.0067, lng: 106.5132 },
    'hoan kiem': { lat: 21.0285, lng: 105.8542 },
    'ba dinh': { lat: 21.0341, lng: 105.8372 },
    'dong da': { lat: 21.0129, lng: 105.8277 },
    'hai ba trung': { lat: 21.0126, lng: 105.8570 },
    'hoang mai': { lat: 20.9760, lng: 105.8549 },
    'thanh xuan': { lat: 20.9935, lng: 105.8115 },
    'long bien': { lat: 21.0374, lng: 105.8828 },
    'nam tu liem': { lat: 21.0128, lng: 105.7609 },
    'bac tu liem': { lat: 21.0625, lng: 105.7485 },
    'tay ho': { lat: 21.0560, lng: 105.8202 },
    'cau giay': { lat: 21.0362, lng: 105.7906 },
    'ha dong': { lat: 20.9636, lng: 105.7632 },
};

// --- HELPER FUNCTIONS ---

const deg2rad = (deg: number) => deg * (Math.PI / 180);

export const calculateDistance = (p1: Coordinate, p2: Coordinate): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(p2.lat - p1.lat);
    const dLon = deg2rad(p2.lng - p1.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

export const geocodeAddress = async (address: string, apiKey: string): Promise<Coordinate | null> => {
    try {
        const cleanAddress = address.trim();
        if (!cleanAddress) return null;

        // Ensure Vietnam context if missing (improves accuracy)
        const queryAddress = cleanAddress.toLowerCase().includes('vietnam') || cleanAddress.toLowerCase().includes('việt nam')
            ? cleanAddress
            : `${cleanAddress}, Việt Nam`;

        // TrackAsia Autocomplete API (v1/autocomplete) - More reliable for address search
        const url = `https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(queryAddress)}&key=${apiKey}&lang=vi`;

        const response = await fetch(url);
        const data = await response.json();

        // TrackAsia returns GeoJSON. features[0].geometry.coordinates is [lng, lat]
        if (data && data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            return { lat, lng };
        } else {
            console.warn(`Geocoding failed for ${address}`);
            return null;
        }
    } catch (error) {
        console.error("Geocoding network error:", error);
        return null;
    }
};

// --- VRP SOLVER ---

export const solveVRP = async (orders: Order[], origin: Coordinate, apiKey: string, config: RouteConfig): Promise<Cluster[]> => {
    // 1. Prepare Data for VRP API
    // TrackAsia VRP requires INTEGER IDs. We must map our String IDs to Integers.

    const orderIdMap = new Map<number, string>(); // int -> string (orderId)

    // Helper to generate unique ints
    let nextId = 1;
    const getIntId = () => nextId++;

    // Use 'jobs' for simple deliveries (One Depot -> Many Customers)
    const jobs = orders.map(order => {
        const jobId = getIntId();
        orderIdMap.set(jobId, order.id);

        return {
            id: jobId,
            location: [order.coordinates!.lng, order.coordinates!.lat],
            service: 300, // 5 minutes per stop
            delivery: [1] // Consumes 1 unit of capacity
        };
    });

    // Create Vehicles
    const vehicles = [];

    // USER REQUEST: Max Stops Constraint Strategy
    // 1. User inputs Max_Stops (config.maxOrdersPerShipper)
    // 2. We generate MORE vehicles than needed (e.g. * 1.5) to let the algorithm choose the optimal number.
    const maxStops = config.maxOrdersPerShipper;
    const minVehicles = Math.ceil(orders.length / maxStops);

    // Generate 1.5x needed vehicles (minimum 5 to be safe)
    const vehicleCount = Math.max(Math.ceil(minVehicles * 1.5), 5);

    console.log(`VRP Setup: ${orders.length} orders, MaxStops=${maxStops}. Generating ${vehicleCount} vehicles.`);

    for (let i = 0; i < vehicleCount; i++) {
        const vehicleId = getIntId();

        vehicles.push({
            id: vehicleId,
            start: [origin.lng, origin.lat],
            // end: null, // REMOVED: To ensure Open Route (default behavior if omitted in some engines, or use specific flag if needed)
            // Actually, for TrackAsia/VROOM, omitting end usually means "end anywhere" (Open Route)
            capacity: [maxStops], // Strict Max Stops constraint
            profile: "car", // Revert to 'car' as 'motorcycle' is not supported by this VRP API endpoint
        });
    }

    const payload = {
        jobs: jobs, // Use jobs instead of shipments
        vehicles: vehicles,
        options: {
            g: true // Return geometry (polylines)
        }
    };

    // 2. Call API
    console.log(`[DEBUG] Calling VRP API with payload:`, JSON.stringify(payload));
    const response = await fetch(`https://maps.track-asia.com/api/v1/vrp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`[DEBUG] VRP Response:`, data);

    if (!data || !data.routes) {
        console.error("VRP Response Error:", data);
        throw new Error("VRP API did not return routes. " + (data.error || data.message || "Unknown error"));
    }

    // 3. Parse Response into Clusters
    const clusterColors = ['#2DE1C2', '#5B67C9', '#F6E05E', '#F687B3', '#68D391', '#63B3ED', '#ED8936', '#9F7AEA'];

    return data.routes.map((route: any, idx: number) => {
        // Map steps back to orders
        const routeOrders: Order[] = [];
        const steps = route.steps;

        steps.forEach((step: any) => {
            if (step.type === 'job') { // Check for 'job' type
                // step.job is the job ID (Integer)
                const jobIntId = step.job;
                const originalOrderId = orderIdMap.get(jobIntId);

                if (originalOrderId) {
                    const order = orders.find(o => o.id === originalOrderId);
                    if (order) routeOrders.push(order);
                }
            }
        });

        return {
            id: `CL-VRP-${Date.now()}-${idx}`,
            name: `Chuyến ${idx + 1}`,
            orders: routeOrders,
            totalDistanceKm: parseFloat((route.distance / 1000).toFixed(1)), // API returns meters
            estimatedCost: parseFloat(((route.distance / 1000) * config.costPerKm + (routeOrders.length * (config.costPerPoint || 0))).toFixed(0)),
            extraFee: 0,
            assignedShipperId: null,
            isCompleted: false,
            createdAt: Date.now(),
            color: clusterColors[idx % clusterColors.length],
            centroid: origin,
            geometry: route.geometry // Encoded polyline
        };
    });
};
