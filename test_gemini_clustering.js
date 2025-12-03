
const apiKey = 'AIzaSyCHQtnba6zJCvEhnVftYMp8er8hJG6yVP4';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

const warehouse = "28 Sao Mai, Phường 7, Tân Bình, Hồ Chí Minh";
const orders = [
    { id: "1", address: "Aeon Mall Tân Phú, Celadon City, Tân Phú, HCM" }, // West
    { id: "2", address: "Bến xe Miền Tây, Kinh Dương Vương, Bình Tân, HCM" }, // West
    { id: "3", address: "Công viên Phần mềm Quang Trung, Quận 12, HCM" }, // North
    { id: "4", address: "Emart Gò Vấp, Phan Văn Trị, Gò Vấp, HCM" }, // North
    { id: "5", address: "Chợ Bến Thành, Quận 1, HCM" }, // Center/East
    { id: "6", address: "Landmark 81, Bình Thạnh, HCM" } // East
];

const prompt = `
You are a Logistics Dispatcher for Ho Chi Minh City.
Warehouse: ${warehouse}
Orders:
${JSON.stringify(orders)}

Task: Group these orders into 3 logical clusters based on geographical direction from the warehouse (e.g., West, North, East/Center) to optimize delivery.
Return ONLY valid JSON in this format:
[
  { "name": "Cluster Name", "orderIds": ["id1", "id2"] }
]
`;

const payload = {
    contents: [{
        parts: [{ text: prompt }]
    }]
};

async function run() {
    console.log("Sending to Gemini...");
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
            console.log("Gemini Response:\n", text);
        } else {
            console.error("Error:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Network Error:", e);
    }
}

run();
