
function encodePolyline(coordinates, precision = 5) {
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

function decodePolyline(str, precision = 5) {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
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

// Test Case 1: Simple Line
const points = [[106.660172, 10.762622], [106.7009, 10.7769]];
console.log("Original:", points);
const encoded = encodePolyline(points);
console.log("Encoded:", encoded);
const decoded = decodePolyline(encoded);
console.log("Decoded:", decoded);

// Check equality (approx)
const match = Math.abs(points[0][0] - decoded[0][0]) < 0.00001;
console.log("Match:", match);

// Test Case 2: Append
const newPoint = [106.6580, 10.8180];
decoded.push(newPoint);
const reEncoded = encodePolyline(decoded);
console.log("Re-Encoded:", reEncoded);
const reDecoded = decodePolyline(reEncoded);
console.log("Re-Decoded Last Point:", reDecoded[reDecoded.length - 1]);
