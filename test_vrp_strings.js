
const apiKey = '6e3dbb141206003a34691764322663154b';
const url = `https://maps.track-asia.com/api/v1/vrp?key=${apiKey}`;

const payload = {
    "jobs": [],
    "shipments": [
        {
            "amount": [1],
            "pickup": {
                "id": "pickup-order-123",
                "service": 300,
                "location": [106.7009, 10.7769]
            },
            "delivery": {
                "id": "delivery-order-123",
                "service": 300,
                "location": [106.6843, 10.7844]
            }
        }
    ],
    "vehicles": [
        {
            "id": "vehicle-1",
            "start": [106.7009, 10.7769],
            "end": [106.7009, 10.7769],
            "capacity": [5],
            "profile": "car"
        }
    ],
    "options": {
        "g": true
    }
};

console.log("Sending payload with String IDs...");

async function run() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text);
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
