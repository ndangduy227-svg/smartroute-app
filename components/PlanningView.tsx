import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as turf from '@turf/turf';
import { Order, Shipper, Cluster, Coordinate, OrderStatus, RouteConfig } from '../types';
import { PlanningMap } from './PlanningMap';
import { InteractiveTour, TourStep } from './InteractiveTour';
import { DISTRICT_LOCATIONS, calculateDistance, geocodeAddress, solveVRP } from '../utils/vrpHelpers';

interface PlanningViewProps {
    orders: Order[];
    shippers: Shipper[];
    onClustersGenerated: (clusters: Cluster[]) => void;
    warehouse: Coordinate | null;
    setWarehouse: (coord: Coordinate | null) => void;
}

// Helper to calculate distance between two points (Haversine formula)
// MOVED TO utils/vrpHelpers.ts

export const PlanningView: React.FC<PlanningViewProps> = ({ orders, shippers, onClustersGenerated, warehouse, setWarehouse }) => {
    // Config State
    const [config, setConfig] = useState<RouteConfig>({
        startPoints: [],
        maxOrdersPerShipper: 15,
        maxClusters: 5,
        costPerKm: 10000, // 10k VND per km
        costPerPoint: 5000, // 5k VND per point (default)
        currency: 'VND',
        maxKmPerShipper: 100,
        geminiApiKey: ''
    });

    const [showConfirmModal, setShowConfirmModal] = useState(false); // New: Confirmation Modal State
    const [showTour, setShowTour] = useState(false); // New: Tour State

    const tourSteps: TourStep[] = [
        {
            targetId: 'tour-warehouse',
            title: '2. Xác định Kho hàng',
            content: 'Nhập địa chỉ kho hàng (điểm xuất phát) của bạn. Hệ thống sẽ tính toán lộ trình từ điểm này.'
        },
        {
            targetId: 'tour-config',
            title: '3. Cấu hình Vận chuyển',
            content: 'Thiết lập số đơn tối đa cho mỗi shipper và chi phí vận chuyển để hệ thống tính toán chính xác.'
        },
        {
            targetId: 'tour-optimize',
            title: '4. Tối ưu hóa',
            content: 'Sau khi chọn các đơn hàng cần giao, bấm nút này để hệ thống tự động sắp xếp tuyến đường thông minh nhất.'
        }
    ];

    // Sync prop changes to local config (optional, but good for consistency)


    const handleConfigChange = (field: keyof RouteConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };


    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set(orders.map(o => o.id)));
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('MAP');

    // Filter State
    const [filterField, setFilterField] = useState<keyof Order | 'all'>('all');
    const [filterCondition, setFilterCondition] = useState<'contains' | 'equals' | 'hasValue'>('contains');
    const [filterValue, setFilterValue] = useState('');

    // Enriched Orders with Coordinates
    const [mappedOrders, setMappedOrders] = useState<Order[]>([]);
    // Warehouse Coords - REMOVED LOCAL STATE, USING PROP
    const [startPointAddress, setStartPointAddress] = useState<string>('');


    // Initialize mappedOrders from props
    useEffect(() => {
        setMappedOrders(orders);
    }, [orders]);

    const toggleOrder = (id: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedOrderIds(newSet);
    };

    // Filter Logic
    const filteredOrders = mappedOrders.filter(o => {
        if (o.status !== OrderStatus.PENDING) return false;
        if (filterField === 'all') return true; // Or implement global search

        const val = String(o[filterField] || '').toLowerCase();
        const search = filterValue.toLowerCase();

        if (filterCondition === 'hasValue') return val.trim() !== '';
        if (filterCondition === 'equals') return val === search;
        return val.includes(search);
    });

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const newSet = new Set(selectedOrderIds);
            filteredOrders.forEach(o => newSet.add(o.id));
            setSelectedOrderIds(newSet);
        } else {
            const newSet = new Set(selectedOrderIds);
            filteredOrders.forEach(o => newSet.delete(o.id));
            setSelectedOrderIds(newSet);
        }
    };


    const handleStartPointChange = (idx: number, val: string) => {
        const newPoints = [...config.startPoints];
        newPoints[idx] = val;
        setConfig({ ...config, startPoints: newPoints });
        setStartPointAddress(val);
        // Reset coords if text changes, forcing re-validation
        setWarehouse(null);
    };

    // --- TRACKASIA GEOCODING ---

    // --- TRACKASIA GEOCODING ---
    // Moved to utils/vrpHelpers.ts




    const handleCheckStartPoint = async () => {

        if (!config.startPoints[0]) {
            alert("Vui lòng nhập địa chỉ kho hàng.");
            return;
        }

        setIsOptimizing(true);
        setStatusMessage('Đang xác thực địa chỉ kho hàng...');

        const coords = await geocodeAddress(config.startPoints[0]);
        if (coords) {
            setWarehouse(coords);
            setStartPointAddress(config.startPoints[0]);
            setViewMode('MAP');
        } else {
            alert("Không tìm thấy địa chỉ này trên bản đồ TrackAsia. Vui lòng kiểm tra lại chính tả.");
            setWarehouse(null);
            setStartPointAddress('');
        }

        setIsOptimizing(false);
    };

    // Analyze address text to approximate location without API Key (Fallback)
    const smartHeuristicGeocoding = (ordersToProcess: Order[]): Order[] => {
        return ordersToProcess.map(o => {
            if (o.coordinates) return o; // Already has coords

            const addressLower = o.address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let coords: Coordinate | null = null;

            const numberMatch = addressLower.match(/(?:quan|q\.?|district)\s*([0-9]+)/);
            if (numberMatch && DISTRICT_LOCATIONS[numberMatch[1]]) {
                const base = DISTRICT_LOCATIONS[numberMatch[1]];
                coords = {
                    lat: base.lat + (Math.random() - 0.5) * 0.015,
                    lng: base.lng + (Math.random() - 0.5) * 0.015
                };
            }

            if (!coords) {
                for (const [key, val] of Object.entries(DISTRICT_LOCATIONS)) {
                    if (isNaN(Number(key)) && addressLower.includes(key)) {
                        coords = {
                            lat: val.lat + (Math.random() - 0.5) * 0.015,
                            lng: val.lng + (Math.random() - 0.5) * 0.015
                        };
                        break;
                    }
                }
            }

            if (!coords) {
                const bounds = {
                    minLat: 10.7200, maxLat: 10.8500,
                    minLng: 106.6000, maxLng: 106.7500
                };
                coords = {
                    lat: bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat),
                    lng: bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng)
                };
            }

            return { ...o, coordinates: coords };
        });
    };

    const performKMeansClustering = (ordersToCluster: Order[], k: number, origin?: Coordinate): Cluster[] => {
        if (ordersToCluster.length === 0) return [];

        let centroids: Coordinate[] = [];

        if (origin && k > 0) {
            centroids.push(origin);
        }

        const shuffled = [...ordersToCluster].sort(() => 0.5 - Math.random());
        for (let i = centroids.length; i < k; i++) {
            if (shuffled[i] && shuffled[i].coordinates) {
                centroids.push(shuffled[i].coordinates!);
            } else {
                centroids.push({ lat: 10.762622, lng: 106.660172 });
            }
        }

        let clusters: { [key: number]: Order[] } = {};
        let iterations = 0;
        const maxIterations = 20;

        while (iterations < maxIterations) {
            clusters = {};
            for (let i = 0; i < k; i++) clusters[i] = [];

            ordersToCluster.forEach(order => {
                if (!order.coordinates) return;

                let minDist = Infinity;
                let closestCentroidIndex = 0;

                centroids.forEach((centroid, idx) => {
                    const dist = calculateDistance(order.coordinates!, centroid);
                    if (dist < minDist) {
                        minDist = dist;
                        closestCentroidIndex = idx;
                    }
                });

                clusters[closestCentroidIndex].push(order);
            });

            const newCentroids: Coordinate[] = [];
            let changed = false;

            for (let i = 0; i < k; i++) {
                const clusterPoints = clusters[i];
                if (clusterPoints.length === 0) {
                    newCentroids.push(centroids[i]);
                    continue;
                }

                const sumLat = clusterPoints.reduce((sum, p) => sum + (p.coordinates?.lat || 0), 0);
                const sumLng = clusterPoints.reduce((sum, p) => sum + (p.coordinates?.lng || 0), 0);

                const newC = {
                    lat: sumLat / clusterPoints.length,
                    lng: sumLng / clusterPoints.length
                };
                newCentroids.push(newC);

                if (Math.abs(newC.lat - centroids[i].lat) > 0.0001 || Math.abs(newC.lng - centroids[i].lng) > 0.0001) {
                    changed = true;
                }
            }

            centroids = newCentroids;
            if (!changed) break;
            iterations++;
        }

        const clusterColors = ['#2DE1C2', '#5B67C9', '#F6E05E', '#F687B3', '#68D391', '#63B3ED', '#ED8936', '#9F7AEA'];

        return Object.keys(clusters).map((key, idx) => {
            const clusterOrders = clusters[parseInt(key)];

            // --- ROUTING LOGIC ---
            // Using Nearest Neighbor algo powered by accurate TrackAsia Coordinates
            let currentPos = origin || centroids[idx];
            const sortedOrders: Order[] = [];
            const unvisited = [...clusterOrders];

            let totalDist = 0;

            while (unvisited.length > 0) {
                let nearestIdx = -1;
                let nearestDist = Infinity;

                unvisited.forEach((o, i) => {
                    const d = calculateDistance(currentPos, o.coordinates!);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearestIdx = i;
                    }
                });

                if (nearestIdx !== -1) {
                    const nearest = unvisited[nearestIdx];
                    totalDist += nearestDist;
                    currentPos = nearest.coordinates!;
                    sortedOrders.push(nearest);
                    unvisited.splice(nearestIdx, 1);
                } else {
                    break;
                }
            }

            return {
                id: `CL-${Date.now()}-${idx}`,
                name: `Chuyến ${idx + 1}`,
                orders: sortedOrders,
                totalDistanceKm: parseFloat(totalDist.toFixed(1)),
                estimatedCost: parseFloat((totalDist * config.costPerKm).toFixed(0)),
                extraFee: 0,
                assignedShipperId: null,
                isCompleted: false,
                createdAt: Date.now(),
                color: clusterColors[idx % clusterColors.length],
                centroid: centroids[idx]
            };
        }).filter(c => c.orders.length > 0);
    };

    // --- TRACK ASIA VRP INTEGRATION ---
    // --- TRACK ASIA VRP INTEGRATION ---
    // Moved to utils/vrpHelpers.ts

    // --- TURF.JS K-MEANS INTEGRATION ---
    const performTurfKMeans = (orders: Order[], k: number, origin: Coordinate): Cluster[] => {
        if (orders.length === 0) return [];

        // 1. Convert Orders to GeoJSON Points
        // @ts-ignore
        const points = turf.featureCollection(
            orders.map(order =>
                // @ts-ignore
                turf.point([order.coordinates!.lng, order.coordinates!.lat], { orderId: order.id })
            )
        );

        // 2. Run K-Means
        // @ts-ignore
        const clustered = turf.clustersKmeans(points, { numberOfClusters: k });

        // 3. Group back into Clusters
        const clustersMap: { [key: number]: Order[] } = {};

        clustered.features.forEach((feature: any) => {
            const clusterId = feature.properties.cluster;
            const orderId = feature.properties.orderId;
            const order = orders.find(o => o.id === orderId);

            if (order) {
                if (!clustersMap[clusterId]) clustersMap[clusterId] = [];
                clustersMap[clusterId].push(order);
            }
        });

        // 4. Create Cluster Objects
        const clusterColors = ['#2DE1C2', '#5B67C9', '#F6E05E', '#F687B3', '#68D391', '#63B3ED', '#ED8936', '#9F7AEA'];

        return Object.keys(clustersMap).map((key, idx) => {
            const clusterOrders = clustersMap
            [parseInt(key)];

            // Calculate Centroid
            const sumLat = clusterOrders.reduce((sum, o) => sum + o.coordinates!.lat, 0);
            const sumLng = clusterOrders.reduce((sum, o) => sum + o.coordinates!.lng, 0);
            const centroid = {
                lat: sumLat / clusterOrders.length,
                lng: sumLng / clusterOrders.length
            };

            return {
                id: `CL-TURF-${Date.now()}-${idx}`,
                name: `Cụm ${idx + 1}`,
                orders: clusterOrders,
                totalDistanceKm: 0, // Will be updated by VRP
                estimatedCost: 0,
                extraFee: 0,
                assignedShipperId: null,
                isCompleted: false,
                createdAt: Date.now(),
                color: clusterColors[idx % clusterColors.length],
                centroid: centroid
            };
        });
    };

    const handleStartOptimization = () => {
        if (!warehouse) {
            alert("Vui lòng xác thực địa chỉ kho hàng trước!");
            return;
        }
        setShowConfirmModal(true);
    };

    const runRouteOptimization = async () => {
        setShowConfirmModal(false);
        setIsOptimizing(true);
        setStatusMessage('Preparing Data...');

        const activeOrders = mappedOrders.filter(o => selectedOrderIds.has(o.id) && o.status === OrderStatus.PENDING);

        if (activeOrders.length === 0) {
            setIsOptimizing(false);
            alert("Vui lòng chọn đơn hàng cần sắp xếp.");
            return;
        }

        try {
            await new Promise(r => setTimeout(r, 600));

            let processedOrders = [...activeOrders];
            let originCoords: Coordinate | undefined = warehouse || undefined;

            // 1. Geocode Warehouse if not already done
            if (!originCoords) {
                setStatusMessage('Đang tìm vị trí kho hàng (TrackAsia)...');
                const sp = await geocodeAddress(config.startPoints[0]);
                if (sp) {
                    originCoords = sp;
                    setWarehouse(sp);
                } else {
                    alert("Bắt buộc phải có địa chỉ kho hàng chính xác để tối ưu.");
                    setIsOptimizing(false);
                    return;
                }
            }

            setStatusMessage('Đang lấy tọa độ đơn hàng...');

            const updatedOrders = [];
            let processedCount = 0;

            for (const order of activeOrders) {
                // Skip if we already have coords from a previous run
                if (order.coordinates && order.coordinates.lat !== 0) {
                    updatedOrders.push(order);
                    continue;
                }

                const coords = await geocodeAddress(order.address);

                updatedOrders.push({
                    ...order,
                    coordinates: coords || undefined
                });

                processedCount++;
                if (processedCount % 3 === 0) setStatusMessage(`TrackAsia Geocoding... (${processedCount} / ${activeOrders.length})`);

                // TrackAsia rate limit handling (safe delay)
                await new Promise(r => setTimeout(r, 100));
            }

            // Filter out orders that failed geocoding
            processedOrders = updatedOrders.filter(o => o.coordinates);

            if (processedOrders.length < activeOrders.length) {
                console.warn(`Skipped ${activeOrders.length - processedOrders.length} orders due to geocoding failure.`);
            }

            setMappedOrders(prev => prev.map(p => {
                const found = processedOrders.find(g => g.id === p.id);
                return found || p;
            }));

            let clusters: Cluster[] = [];

            if (originCoords) {
                // STRATEGY: CLUSTERING FIRST (Turf.js K-Means) -> ROUTING LATER (VRP)

                // 1. Calculate Number of Clusters (Vehicles)
                // k = ceil(Total Orders / Max Orders per Shipper)
                const k = Math.ceil(processedOrders.length / config.maxOrdersPerShipper);
                const safeK = Math.max(k, 1);

                console.log(`[DEBUG] Starting Optimization. Total Orders: ${processedOrders.length}, Max/Shipper: ${config.maxOrdersPerShipper}, Calculated k: ${safeK}`);

                setStatusMessage(`Đang phân cụm K-Means (${safeK} cụm) với Turf.js...`);

                // 2. Run Turf K-Means
                const initialClusters = performTurfKMeans(processedOrders, safeK, originCoords);
                console.log(`[DEBUG] K-Means Result:`, initialClusters);

                // 3. Run VRP for each Cluster
                setStatusMessage('Đang tối ưu hóa từng cụm (VRP)...');

                const vrpPromises = initialClusters.map(async (turfCluster, idx) => {
                    if (turfCluster.orders.length === 0) return null;

                    console.log(`[DEBUG] Processing Cluster ${idx + 1} with ${turfCluster.orders.length} orders...`);

                    try {
                        // Run VRP for this specific cluster
                        // We pass the cluster orders to solveVRP.
                        // solveVRP will treat them as a single job set.
                        // Since we already split by capacity (roughly), VRP should return 1 route.
                        // However, solveVRP generates vehicles based on config.maxOrdersPerShipper.
                        // Since turfCluster.orders.length <= maxOrdersPerShipper (ideally, but K-Means doesn't guarantee count),
                        // we might need to be careful.
                        // But generally, VRP will optimize the path.

                        const routes = await solveVRP(turfCluster.orders, originCoords!, config);
                        console.log(`[DEBUG] VRP Success for Cluster ${idx + 1}. Routes:`, routes);

                        if (routes.length > 0) {
                            // If VRP returns multiple routes for a single cluster (because K-Means put too many points),
                            // we should probably keep them.
                            // But to keep it simple and match the "Cluster Color" requirement,
                            // we can map them all to the same cluster color/ID base.

                            return routes.map((r, rIdx) => ({
                                ...r,
                                id: `${turfCluster.id}-VRP-${rIdx}`,
                                name: `Cụm ${idx + 1} - Chuyến ${rIdx + 1}`,
                                color: turfCluster.color // Keep the cluster color
                            }));
                        }
                        return [turfCluster]; // Fallback if VRP returns nothing but no error
                    } catch (err) {
                        console.error(`[DEBUG] VRP FAILED for Cluster ${idx + 1}:`, err);
                        return [turfCluster]; // Fallback to straight line
                    }
                });

                const results = await Promise.all(vrpPromises);
                // Flatten the results because each promise returns an array of routes
                let rawClusters = results.filter(r => r !== null).flat() as Cluster[];

                // RE-ASSIGN COLORS AND NAMES
                // This fixes the issue where multiple routes from the same cluster (or different clusters) might share colors accidentally.
                const finalColors = ['#2DE1C2', '#5B67C9', '#F6E05E', '#F687B3', '#68D391', '#63B3ED', '#ED8936', '#9F7AEA', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

                clusters = rawClusters.map((c, i) => ({
                    ...c,
                    name: `Cụm ${i + 1} (${c.totalDistanceKm}km - ${c.estimatedCost.toLocaleString('vi-VN')}đ)`,
                    color: finalColors[i % finalColors.length]
                }));

            } else {
                // Should not happen due to check above
                clusters = [];
            }

            onClustersGenerated(clusters);
        } catch (e) {
            console.error(e);
            alert("Có lỗi xảy ra. Vui lòng kiểm tra console.");
        } finally {
            setIsOptimizing(false);
        }
    };



    const handlePreviewMap = async () => {
        // 1. Check Warehouse
        if (!warehouse) {
            setStatusMessage('Đang lấy vị trí kho (TrackAsia)...');
            const sp = await geocodeAddress(config.startPoints[0]);
            if (sp) {
                setWarehouse(sp);
                setStartPointAddress(config.startPoints[0]);
            }
        }

        // 2. Check Orders
        let withCoords = mappedOrders;
        setIsOptimizing(true);
        setStatusMessage('Đang lấy tọa độ các đơn hàng...');
        const pending = mappedOrders.filter(o => selectedOrderIds.has(o.id) && o.status === OrderStatus.PENDING && !o.coordinates);

        if (pending.length > 0) {
            const updatedPending = [];
            let processedCount = 0;
            for (const order of pending) {
                const coords = await geocodeAddress(order.address);
                updatedPending.push({ ...order, coordinates: coords || undefined });

                processedCount++;
                if (processedCount % 5 === 0) setStatusMessage(`TrackAsia Geocoding... (${processedCount}/${pending.length})`);
                await new Promise(r => setTimeout(r, 100));
            }

            withCoords = mappedOrders.map(m => {
                const found = updatedPending.find(u => u.id === m.id);
                return found || m;
            });
        }
        setIsOptimizing(false);

        // Always fall back to heuristic for any still missing coords
        withCoords = smartHeuristicGeocoding(withCoords);
        setMappedOrders(withCoords);
    };

    return (
        <div className="flex flex-col h-full p-6 gap-6">
            {/* Top Configuration Bar */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Hệ thống SmartRoute
                        </h3>
                        <p className="text-sm text-gray-400">
                            Hệ thống tối ưu hóa tuyến đường vận chuyển. Powered by Mindtransform.
                        </p>
                        <button
                            onClick={() => setShowTour(true)}
                            className="mt-2 text-xs font-bold text-brand-teal hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Hướng dẫn bạn mới
                        </button>
                    </div>

                    {/* --- API KEY CONFIGURATION REMOVED --- */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800" id="tour-config">
                    <div className="relative" id="tour-warehouse">
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 flex justify-between">
                            Điểm lấy hàng (Kho)
                            {warehouse && <span className="text-green-400 font-normal">✓ Đã tìm thấy</span>}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={config.startPoints[0]}
                                onChange={(e) => handleStartPointChange(0, e.target.value)}
                                className={`w-full bg-slate-800 border rounded p-2 text-sm text-white focus:ring-1 focus:ring-brand-teal outline-none ${warehouse ? 'border-green-500/50' : 'border-slate-600'}`}
                                placeholder="VD: 123 Lê Lợi, Quận 1"
                            />
                            <button
                                onClick={handleCheckStartPoint}
                                title="Xác thực địa chỉ kho"
                                className="px-3 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 transition-colors whitespace-nowrap"
                            >
                                Tìm kiếm
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Tối đa đơn / Shipper</label>
                        <input type="number" value={config.maxOrdersPerShipper} onChange={(e) => setConfig({ ...config, maxOrdersPerShipper: parseInt(e.target.value) })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white" />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Phí Ship / km (VND)</label>
                        <input type="number" value={config.costPerKm} onChange={(e) => setConfig({ ...config, costPerKm: parseInt(e.target.value) })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Phí Ship / điểm giao (VND)</label>
                        <input type="number" value={config.costPerPoint} onChange={(e) => setConfig({ ...config, costPerPoint: parseInt(e.target.value) })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white" />
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex flex-1 gap-6 min-h-0">
                {/* Left: Order List */}
                <div className="w-1/3 flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-800 border-b border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-white">Đơn hàng chờ xử lý</h4>
                            <span className="text-xs bg-brand-teal text-brand-dark px-2 py-0.5 rounded-full font-bold">{selectedOrderIds.size} Đã chọn</span>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-col gap-2 mb-2">
                            <div className="flex gap-1">
                                <select
                                    className="bg-slate-900 border border-slate-600 text-xs text-white rounded px-1 py-1 flex-1"
                                    value={filterField}
                                    onChange={(e) => setFilterField(e.target.value as any)}
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="customerName">Tên KH</option>
                                    <option value="address">Địa chỉ</option>
                                    <option value="phoneNumber">SĐT</option>
                                    <option value="cod">COD</option>
                                    <option value="note">Ghi chú</option>
                                </select>
                                <select
                                    className="bg-slate-900 border border-slate-600 text-xs text-white rounded px-1 py-1 w-24"
                                    value={filterCondition}
                                    onChange={(e) => setFilterCondition(e.target.value as any)}
                                >
                                    <option value="contains">Chứa</option>
                                    <option value="equals">Bằng</option>
                                    <option value="hasValue">Có giá trị</option>
                                </select>
                            </div>
                            {filterCondition !== 'hasValue' && (
                                <input
                                    type="text"
                                    className="bg-slate-900 border border-slate-600 text-xs text-white rounded px-2 py-1 w-full"
                                    placeholder="Giá trị lọc..."
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                            <input
                                type="checkbox"
                                id="selectAll"
                                checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id))}
                                onChange={handleSelectAll}
                                className="rounded border-slate-600 bg-slate-900 text-brand-teal focus:ring-0"
                            />
                            <label htmlFor="selectAll" className="text-xs text-gray-400 cursor-pointer select-none">Chọn tất cả ({filteredOrders.length})</label>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => toggleOrder(order.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex gap-3 ${selectedOrderIds.has(order.id)
                                    ? 'bg-brand-purple/20 border-brand-purple'
                                    : 'bg-slate-800 border-slate-700 hover:border-gray-500'
                                    }`}
                            >
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrderIds.has(order.id)}
                                        readOnly
                                        className="rounded border-slate-600 bg-slate-900 text-brand-teal focus:ring-0 pointer-events-none"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-white truncate">{order.customerName}</span>
                                        <span className="text-xs text-brand-teal font-mono whitespace-nowrap ml-2">{order.cod.toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 truncate" title={order.address}>{order.address}</p>
                                    {order.coordinates && (
                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                            GPS TrackAsia
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Map & Action */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* View Toggle */}
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500 italic">
                            Đang sử dụng TrackAsia API.
                        </div>
                        <button
                            onClick={() => { setViewMode('MAP'); handlePreviewMap(); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${viewMode === 'MAP' ? 'bg-brand-purple text-white' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 7m0 13V7" /></svg>
                            Xem trước vị trí
                        </button>
                    </div>

                    {/* Map Container */}
                    <div className="flex-1 min-h-0 relative">
                        {viewMode === 'MAP' && (
                            <PlanningMap
                                orders={mappedOrders.filter(o => selectedOrderIds.has(o.id) && o.status === OrderStatus.PENDING)}
                                warehouse={warehouse}
                                apiKey={''}
                            />
                        )}

                        {/* Processing Overlay */}
                        {isOptimizing && (
                            <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-t-brand-teal border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Đang xử lý</h3>
                                <p className="text-brand-teal font-mono text-sm animate-pulse">{statusMessage}</p>
                            </div>
                        )}
                    </div>

                    {/* Main Action Button */}
                    <button
                        id="tour-optimize"
                        onClick={handleStartOptimization}
                        disabled={isOptimizing || selectedOrderIds.size === 0 || !warehouse}
                        title={!warehouse ? "Vui lòng xác thực địa chỉ kho hàng trước" : ""}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${isOptimizing || selectedOrderIds.size === 0 || !warehouse
                            ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-brand-teal to-teal-400 text-brand-dark shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.01]'
                            }`}
                    >
                        {isOptimizing ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-brand-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang tối ưu hóa...
                            </>
                        ) : (
                            <>
                                <span>Tạo tuyến đường tối ưu</span>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Xác nhận kho hàng
                        </h3>
                        <p className="text-gray-300 mb-2">Vui lòng xác nhận địa chỉ kho hàng của bạn là chính xác:</p>
                        <div className="bg-slate-900 p-3 rounded border border-slate-700 mb-6 text-brand-teal font-mono text-sm break-words">
                            {startPointAddress || "Chưa có địa chỉ"}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={runRouteOptimization}
                                className="flex-1 py-2 bg-brand-teal hover:bg-teal-400 text-brand-dark rounded font-bold transition-colors"
                            >
                                Xác nhận & Tối ưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Tour */}
            <InteractiveTour
                steps={tourSteps}
                isOpen={showTour}
                onClose={() => setShowTour(false)}
                onComplete={() => setShowTour(false)}
            />




        </div>
    );
};