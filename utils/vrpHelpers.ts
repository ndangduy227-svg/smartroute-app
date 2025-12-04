import { Order, Cluster, Coordinate, RouteConfig } from '../types';

// Extend RouteConfig to include forceSingleVehicle
declare module '../types' {
    interface RouteConfig {
        forceSingleVehicle?: boolean;
    }
}

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

// --- POLYLINE HELPER FUNCTIONS ---

function encodePolyline(coordinates: [number, number][], precision: number = 5): string {
    let output = '';
    let lastLat = 0;
    let lastLng = 0;
    const factor = Math.pow(10, precision);

    coordinates.forEach(([lng, lat]) => {
        const latVal = Math.round(lat * factor);
        const lngVal = Math.round(lng * factor);

        const dLat = latVal - lastLat;
        const dLng = lngVal - lastLng;

        [dLat, dLng].forEach(val => {
            let num = val < 0 ? ~(val << 1) : (val << 1);
            while (num >= 0x20) {
                output += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
                num >>= 5;
            }
            output += String.fromCharCode(num + 63);
        });

        lastLat = latVal;
        lastLng = lngVal;
    });

    return output;
}

function decodePolyline(str: string, precision: number = 5): [number, number][] {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates: [number, number][] = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision);

    while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lng / factor, lat / factor]);
    }

    return coordinates;
}

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
            // Only add delivery amount if NOT forcing single vehicle (TSP mode)
            ...(config.forceSingleVehicle ? {} : { delivery: [1] })
        };
    });

    // Create Vehicles
    const vehicles = [];

    // USER REQUEST: Max Stops Constraint Strategy
    // 1. User inputs Max_Stops (config.maxOrdersPerShipper)
    // 2. We generate MORE vehicles than needed (e.g. * 1.5) to let the algorithm choose the optimal number.
    // If forceSingleVehicle is true, we MUST ensure the single vehicle has enough capacity for ALL orders.
    const maxStops = config.forceSingleVehicle ? Math.max(config.maxOrdersPerShipper, orders.length) : config.maxOrdersPerShipper;
    const minVehicles = Math.ceil(orders.length / maxStops);

    // Generate 1.5x needed vehicles (minimum 5 to be safe), UNLESS forced to single vehicle
    const vehicleCount = config.forceSingleVehicle ? 1 : Math.max(Math.ceil(minVehicles * 1.5), 5);

    console.log(`VRP Setup: ${orders.length} orders, MaxStops=${maxStops}. Generating ${vehicleCount} vehicles.`);

    for (let i = 0; i < vehicleCount; i++) {
        const vehicleId = getIntId();

        vehicles.push({
            id: vehicleId,
            start: [origin.lng, origin.lat],
            // end: null, // REMOVED: To ensure Open Route (default behavior if omitted in some engines, or use specific flag if needed)
            // Actually, for TrackAsia/VROOM, omitting end usually means "end anywhere" (Open Route)
            // Only add capacity if NOT forcing single vehicle
            ...(config.forceSingleVehicle ? {} : { capacity: [maxStops] }),
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

    const parsedRoutes = data.routes.map((route: any, idx: number) => {
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

    // 4. Handle Unassigned Jobs
    if (data.unassigned && Array.isArray(data.unassigned) && data.unassigned.length > 0) {
        const unassignedOrders: Order[] = [];
        data.unassigned.forEach((item: any) => {
            // item.id is the job ID
            const jobIntId = item.id;
            const originalOrderId = orderIdMap.get(jobIntId);
            if (originalOrderId) {
                const order = orders.find(o => o.id === originalOrderId);
                if (order) unassignedOrders.push(order);
            }
        });

        if (unassignedOrders.length > 0) {
            console.warn(`[VRP] ${unassignedOrders.length} orders were unassigned. Reasons:`, data.unassigned.map((u: any) => u.description || u.reason || 'Unknown'));

            // IF FORCE SINGLE VEHICLE: We must NOT leave them behind.
            // We will append them to the main route (if exists) or create a new one if none.
            // Since VRP failed to route them (likely due to map data issues or accessibility),
            // we will just draw a STRAIGHT LINE to them from the last point.

            // IF FORCE SINGLE VEHICLE: We must NOT leave them behind.
            // We will append them to the main route (if exists) or create a new one if none.

            if (config.forceSingleVehicle) {
                console.log(`[VRP] ForceSingleVehicle active. Processing ${unassignedOrders.length} unassigned orders.`);

                // 1. Handle Multiple Routes (Merge them first if needed)
                let mainRoute = parsedRoutes[0];

                if (parsedRoutes.length > 1) {
                    console.warn(`[VRP] Expected 1 route but got ${parsedRoutes.length}. Merging...`);
                    // Sort by size (descending) to find the "main" chunk, or just sequence them?
                    // Ideally we sequence them. But we don't know the order.
                    // Let's just append subsequent routes to the first one.

                    for (let i = 1; i < parsedRoutes.length; i++) {
                        const nextRoute = parsedRoutes[i];

                        // Connect mainRoute END to nextRoute START
                        const currentPath = decodePolyline(mainRoute.geometry);
                        const nextPath = decodePolyline(nextRoute.geometry);

                        // Add straight line connection (implicitly done by just appending points)
                        // Note: decodePolyline returns [lng, lat]

                        // Append orders
                        mainRoute.orders.push(...nextRoute.orders);

                        // Append geometry
                        // We just concat the paths. The renderer will draw a straight line between the gap.
                        const combinedPath = [...currentPath, ...nextPath];
                        mainRoute.geometry = encodePolyline(combinedPath);

                        // Update metrics
                        mainRoute.totalDistanceKm += nextRoute.totalDistanceKm;
                        mainRoute.estimatedCost += nextRoute.estimatedCost;
                    }

                    // Remove merged routes
                    parsedRoutes.splice(1);
                }

                if (!mainRoute) {
                    // Should not happen if we have unassigned orders but no routes?
                    // If NO routes were created, create a dummy one.
                    mainRoute = {
                        id: `CL-VRP-FORCED-${Date.now()}`,
                        name: `Chuyến 1`,
                        orders: [],
                        totalDistanceKm: 0,
                        estimatedCost: 0,
                        extraFee: 0,
                        assignedShipperId: null,
                        isCompleted: false,
                        createdAt: Date.now(),
                        color: clusterColors[0],
                        centroid: origin,
                        geometry: ''
                    };
                    parsedRoutes.push(mainRoute);
                }

                // 2. Append Unassigned Orders
                // Get the last coordinate of the current main route
                let lastPoint: [number, number] | null = null;

                // Need to decode again because we might have merged above
                let currentPath = decodePolyline(mainRoute.geometry);

                if (currentPath.length > 0) {
                    lastPoint = currentPath[currentPath.length - 1];
                } else {
                    lastPoint = [origin.lng, origin.lat];
                    currentPath.push(lastPoint); // Start at origin
                }

                // Append straight lines to unassigned orders
                unassignedOrders.forEach(o => {
                    if (o.coordinates) {
                        const pt: [number, number] = [o.coordinates.lng, o.coordinates.lat];
                        currentPath.push(pt);
                        mainRoute.orders.push(o);
                    }
                });

                // Re-encode the full path
                mainRoute.geometry = encodePolyline(currentPath);

                console.log(`[VRP] Merged unassigned orders. New path length: ${currentPath.length}`);

            } else {
                parsedRoutes.push({
                    id: `CL-UNASSIGNED-${Date.now()}`,
                    name: `Không thể giao (${unassignedOrders.length})`,
                    orders: unassignedOrders,
                    totalDistanceKm: 0,
                    estimatedCost: 0,
                    extraFee: 0,
                    assignedShipperId: null,
                    isCompleted: false,
                    createdAt: Date.now(),
                    color: '#CBD5E0', // Grey for unassigned
                    centroid: origin,
                    geometry: '' // No geometry
                });
            }
        }
    }

    return parsedRoutes;
};
