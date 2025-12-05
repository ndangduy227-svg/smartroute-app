import React, { useEffect, useRef } from 'react';
import trackasiagl from 'trackasia-gl';
import 'trackasia-gl/dist/trackasia-gl.css';
import { Order, Coordinate } from '../types';

interface PlanningMapProps {
    orders: Order[];
    warehouse: Coordinate | null;
}

export const PlanningMap: React.FC<PlanningMapProps> = ({ orders, warehouse }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const apiKey = import.meta.env.VITE_TRACK_ASIA_API_KEY;

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || !apiKey) return;

        try {
            const map = new trackasiagl.Map({
                container: mapContainerRef.current,
                style: `https://maps.track-asia.com/styles/v1/streets.json?key=${apiKey}`,
                center: [106.694945, 10.769034], // HCM Default
                zoom: 12
            });

            map.addControl(new trackasiagl.NavigationControl(), 'top-right');
            mapRef.current = map;

            return () => {
                map.remove();
            };
        } catch (error) {
            console.error("Error initializing map:", error);
        }
    }, []);

    // Update Markers
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !apiKey) return;

        const updateMarkers = () => {
            // Clear existing markers
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            const bounds = new trackasiagl.LngLatBounds();
            let hasPoints = false;

            // 1. Add Warehouse Marker
            if (warehouse) {
                const el = document.createElement('div');
                el.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="#EF4444" stroke="white" stroke-width="2" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                    <path d="M3 21h18v-8H3v8zm0-10V7l9-5 9 5v4H3z" />
                    <rect x="9" y="14" width="6" height="5" fill="white" fill-opacity="0.3"/>
                </svg>`;

                const marker = new trackasiagl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat([warehouse.lng, warehouse.lat])
                    .setPopup(new trackasiagl.Popup({ offset: 25 }).setHTML('<div style="font-weight:bold; color:#EF4444;">KHO HÀNG (Start Point)</div>'))
                    .addTo(map);

                markersRef.current.push(marker);
                bounds.extend([warehouse.lng, warehouse.lat]);
                hasPoints = true;
            }

            // 2. Add Order Markers
            orders.forEach(order => {
                if (order.coordinates) {
                    const el = document.createElement('div');
                    el.className = 'w-3 h-3 bg-brand-teal rounded-full border border-white shadow-sm';
                    el.style.backgroundColor = '#2DE1C2';

                    const popupContent = `<div style="padding:5px;">
                        <div style="font-weight:bold; color:#020719;">${order.customerName}</div>
                        <div style="font-size:11px; color:#555;">${order.address}</div>
                    </div>`;

                    const marker = new trackasiagl.Marker({ element: el })
                        .setLngLat([order.coordinates.lng, order.coordinates.lat])
                        .setPopup(new trackasiagl.Popup({ offset: 10 }).setHTML(popupContent))
                        .addTo(map);

                    markersRef.current.push(marker);
                    bounds.extend([order.coordinates.lng, order.coordinates.lat]);
                    hasPoints = true;
                }
            });

            // Fit bounds
            if (hasPoints) {
                map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
            }
        };

        if (map.loaded()) {
            updateMarkers();
        } else {
            map.on('load', updateMarkers);
        }

    }, [orders, warehouse]);

    if (!apiKey) {
        return (
            <div className="w-full h-full rounded-xl overflow-hidden relative border border-slate-700 shadow-inner bg-slate-800 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 7m0 13V7" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Chưa kết nối bản đồ</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                    Không tìm thấy API Key trong biến môi trường (VITE_TRACK_ASIA_API_KEY).
                </p>
            </div>
        );
    }

    return (
        <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden relative border border-slate-700 shadow-inner" />
    );
};
