
const apiKey = '6e3dbb141206003a34691764322663154b';
const url = `https://maps.track-asia.com/api/v1/vrp?key=${apiKey}`;

const payload = {
    "jobs": [],
    "shipments": [
        {
            "amount": [1],
            "pickup": {
                "id": 1,
                "service": 300,
                "location": [106.7009, 10.7769] // HCM
            },
            "delivery": {
                "id": 1,
                "service": 300,
                "location": [106.6843, 10.7844] // District 3
            }
        }
    ],
    "vehicles": [
        {
            "id": 1,
            "start": [106.7009, 10.7769],
            "end": [106.7009, 10.7769],
            "capacity": [5],
            "profile": "motorcycle"
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
        const text = await response.text();
        console.log("Response:", text);
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
