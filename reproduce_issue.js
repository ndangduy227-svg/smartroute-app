
const apiKey = '6e3dbb141206003a34691764322663154b';
const url = `https://maps.track-asia.com/api/v1/vrp?key=${apiKey}`;

// Coordinates approx from user image (Tan Son Nhat area)
const airportPoints = [
    { id: 1, lat: 10.8141, lng: 106.6646 }, // Terminal area
    { id: 2, lat: 10.8180, lng: 106.6580 }, // Runway/Apron area
    { id: 3, lat: 10.8000, lng: 106.6600 }, // Nearby street
];

const payload = {
    "jobs": airportPoints.map(p => ({
        id: p.id,
        location: [p.lng, p.lat],
        service: 300
        // No delivery/capacity (TSP mode)
    })),
    "vehicles": [
        {
            "id": 1,
            "start": [106.694945, 10.769034], // Warehouse (Dist 1)
            "profile": "car"
            // No capacity (TSP mode)
        }
    ],
    "options": {
        "g": true
    }
};

console.log("Sending payload:", JSON.stringify(payload, null, 2));

async function run() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Unassigned:", data.unassigned);
        if (data.routes && data.routes.length > 0) {
            console.log("Route found! Distance:", data.routes[0].distance);
            console.log("Steps:", data.routes[0].steps.length);
        } else {
            console.log("No route found.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
