
import React, { useEffect, useRef } from 'react';
import trackasiagl from 'trackasia-gl';
import 'trackasia-gl/dist/trackasia-gl.css';
import { Cluster, Shipper, Order } from '../types';

interface TrackAsiaMapProps {
    clusters: Cluster[];
    shippers: Shipper[];
    selectedClusterId: string | null;
    onSelectCluster: (id: string) => void;
}

// Polyline Decoder (from Google Maps Polyline Algorithm)
const decodePolyline = (str: string, precision?: number) => {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 5);

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
};

export const TrackAsiaMap: React.FC<TrackAsiaMapProps> = ({ clusters, shippers, selectedClusterId, onSelectCluster }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const apiKey = import.meta.env.VITE_TRACK_ASIA_API_KEY;

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (!apiKey) {
            console.error("Missing VITE_TRACK_ASIA_API_KEY");
            return;
        }

        const map = new trackasiagl.Map({
            container: mapContainerRef.current,
            style: `https://maps.track-asia.com/styles/v1/streets.json?key=${apiKey}`,
            center: [106.694945, 10.769034], // HCM
            zoom: 12
        });

        map.addControl(new trackasiagl.NavigationControl(), 'top-right');

        mapRef.current = map;

        return () => {
            map.remove();
        };
    }, []);

    // Update Data
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const updateMap = () => {
            // Clear existing markers
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            // Remove existing layers/sources
            if (map.getLayer('routes-layer')) map.removeLayer('routes-layer');
            if (map.getSource('routes-source')) map.removeSource('routes-source');

            // 1. Draw Routes (Polylines)
            const features: any[] = [];
            const bounds = new trackasiagl.LngLatBounds();

            clusters.forEach(cluster => {
                if (!cluster.geometry) return;

                const coordinates = decodePolyline(cluster.geometry);

                // Extend bounds
                coordinates.forEach((coord: any) => bounds.extend(coord));

                // VISUAL FIX: Ensure the route visually starts at the Warehouse (Centroid)
                // If the first point of the polyline is significantly different from the centroid, prepend the centroid.
                if (cluster.centroid) {
                    const startLng = cluster.centroid.lng;
                    const startLat = cluster.centroid.lat;
                    const firstPoint = coordinates[0];

                    // Simple distance check (approximate) to see if we need to add the start point
                    // If distance > 0.0001 degrees (approx 10m), add it.
                    const dx = Math.abs(firstPoint[0] - startLng);
                    const dy = Math.abs(firstPoint[1] - startLat);

                    if (dx > 0.0001 || dy > 0.0001) {
                        coordinates.unshift([startLng, startLat]);
                    }
                }

                features.push({
                    type: 'Feature',
                    properties: {
                        id: cluster.id,
                        color: cluster.color || '#2DE1C2',
                        name: cluster.name,
                        isSelected: cluster.id === selectedClusterId
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates
                    }
                });

                // Add Markers for Orders
                cluster.orders.forEach((order, idx) => {
                    if (order.coordinates) {
                        const el = document.createElement('div');
                        el.className = 'custom-marker-numbered';
                        el.style.backgroundColor = cluster.color || '#2DE1C2';
                        el.style.width = '30px'; // Slightly larger
                        el.style.height = '30px';
                        el.style.borderRadius = '50%';
                        el.style.border = '2px solid white';
                        el.style.display = 'flex';
                        el.style.alignItems = 'center';
                        el.style.justifyContent = 'center';
                        el.style.color = 'white';
                        el.style.fontSize = '14px'; // Larger font
                        el.style.fontWeight = 'bold';
                        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'; // Add shadow
                        el.innerText = (idx + 1).toString();
                        el.style.cursor = 'pointer';

                        // Popup
                        const popup = new trackasiagl.Popup({ offset: 25 })
                            .setHTML(`<div style="padding: 5px;"><b>${order.customerName}</b><br>${order.address}</div>`);

                        // Use options object for Marker to ensure element is recognized
                        const marker = new trackasiagl.Marker({ element: el })
                            .setLngLat([order.coordinates.lng, order.coordinates.lat])
                            .setPopup(popup)
                            .addTo(map);

                        markersRef.current.push(marker);
                    }
                });
            });

            // Add Warehouse Marker (using first cluster's centroid as proxy)
            if (clusters.length > 0 && clusters[0].centroid) {
                const c = clusters[0].centroid;
                const el = document.createElement('div');
                // Use a larger, distinct Warehouse Icon (House/Store shape)
                el.innerHTML = `<svg width="50" height="50" viewBox="0 0 24 24" fill="#EF4444" stroke="white" stroke-width="2" drop-shadow="0 4px 6px rgba(0,0,0,0.3)">
                    <path d="M3 21h18v-8H3v8zm0-10V7l9-5 9 5v4H3z" />
                    <rect x="9" y="14" width="6" height="5" fill="white" fill-opacity="0.3"/>
                </svg>`;

                const marker = new trackasiagl.Marker(el)
                    .setLngLat([c.lng, c.lat])
                    .addTo(map);
                markersRef.current.push(marker);
                bounds.extend([c.lng, c.lat]);
            }

            if (features.length > 0) {
                map.addSource('routes-source', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: features
                    }
                });

                map.addLayer({
                    id: 'routes-layer',
                    type: 'line',
                    source: 'routes-source',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': ['get', 'color'],
                        'line-width': [
                            'case',
                            ['boolean', ['get', 'isSelected'], false],
                            6, // Selected width
                            3  // Normal width
                        ],
                        'line-opacity': 0.8
                    }
                });

                // Fit bounds
                if (!bounds.isEmpty()) {
                    map.fitBounds(bounds, { padding: 50 });
                }
            }
        };

        if (map.loaded()) {
            updateMap();
        } else {
            map.on('load', updateMap);
        }

    }, [clusters, selectedClusterId]);

    return (
        <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden relative">
            {/* Legend Overlay */}
            <div className="absolute top-2 left-2 bg-slate-900/90 p-3 rounded-lg border border-slate-700 shadow-xl z-10 max-h-[300px] overflow-y-auto backdrop-blur-sm">
                <h4 className="text-white text-xs font-bold mb-2 uppercase tracking-wider border-b border-slate-700 pb-1">Chú thích</h4>
                <div className="flex flex-col gap-2">
                    {clusters.map(cluster => (
                        <div
                            key={cluster.id}
                            className={`flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded transition-colors ${selectedClusterId === cluster.id ? 'bg-slate-800 ring-1 ring-slate-600' : ''}`}
                            onClick={() => onSelectCluster(cluster.id)}
                        >
                            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cluster.color }}></span>
                            <span className="text-gray-300 text-xs font-medium">{cluster.name}</span>
                        </div>
                    ))}
                    {clusters.length > 0 && (
                        <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-700">
                            <span className="flex items-center justify-center w-4 h-4">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF4444"><path d="M3 21h18v-8H3v8zm0-10V7l9-5 9 5v4H3z" /></svg>
                            </span>
                            <span className="text-gray-300 text-xs">Kho hàng</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
