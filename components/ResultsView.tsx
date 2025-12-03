import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cluster, Shipper, OrderStatus, Order } from '../types';
import { TrackAsiaMap } from './TrackAsiaMap';
import { solveVRP } from '../utils/vrpHelpers';

interface ResultsViewProps {
    clusters: Cluster[];
    shippers: Shipper[];
    onComplete: (completedClusters: Cluster[]) => void;
    onUpdateCluster: (cluster: Cluster) => void;
    onUpdateClusters: (clusters: Cluster[]) => void;
    apiKey: string;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ clusters, shippers, onComplete, onUpdateCluster, onUpdateClusters, apiKey }) => {
    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(clusters[0]?.id || null);
    const [viewMode, setViewMode] = useState<'MAP' | 'DETAILS' | 'KANBAN'>('MAP');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);

    const selectedCluster = clusters.find(c => c.id === selectedClusterId);

    const handleAssignShipper = (shipperId: string) => {
        if (!selectedCluster) return;
        onUpdateCluster({ ...selectedCluster, assignedShipperId: shipperId });
    };

    const handleExtraFeeChange = (val: number) => {
        if (!selectedCluster) return;
        onUpdateCluster({ ...selectedCluster, extraFee: val });
    };

    const calculateTotalCod = (cluster: Cluster) => {
        return cluster.orders.reduce((sum, o) => sum + o.cod, 0);
    };

    const calculateNetCollection = (cluster: Cluster) => {
        const totalCod = calculateTotalCod(cluster);
        const shippingFee = cluster.estimatedCost + cluster.extraFee;
        return totalCod - shippingFee;
    };

    const handlePrint = () => {
        if (!selectedCluster) return;
        const originalTitle = document.title;
        document.title = `PhieuGiaoHang-${selectedCluster.name.replace(/\s+/g, '-')}`;
        window.print();
        document.title = originalTitle;
    };

    const completeRoute = () => {
        if (selectedCluster) {
            onUpdateCluster({ ...selectedCluster, isCompleted: true });
        }
    }

    // --- DRAG & DROP LOGIC ---
    // --- DRAG & DROP LOGIC ---
    const handleDragStart = (e: React.DragEvent, orderId: string, sourceClusterId: string) => {
        e.dataTransfer.setData('orderId', orderId);
        e.dataTransfer.setData('sourceClusterId', sourceClusterId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetClusterId: string, targetOrderId?: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling if dropped on an order

        const orderId = e.dataTransfer.getData('orderId');
        const sourceClusterId = e.dataTransfer.getData('sourceClusterId');

        if (!orderId || !sourceClusterId) return;

        const sourceCluster = clusters.find(c => c.id === sourceClusterId);
        const targetCluster = clusters.find(c => c.id === targetClusterId);

        if (!sourceCluster || !targetCluster) return;

        const orderToMove = sourceCluster.orders.find(o => o.id === orderId);
        if (!orderToMove) return;

        // 1. Remove from Source
        let newSourceOrders = sourceCluster.orders.filter(o => o.id !== orderId);

        // 2. Add to Target
        let newTargetOrders = [...targetCluster.orders];

        // If same cluster, we are just reordering, so use the filtered list as base for insertion
        if (sourceClusterId === targetClusterId) {
            newTargetOrders = newSourceOrders;
        }

        if (targetOrderId) {
            // Insert before the target order
            const targetIndex = newTargetOrders.findIndex(o => o.id === targetOrderId);
            if (targetIndex !== -1) {
                newTargetOrders.splice(targetIndex, 0, orderToMove);
            } else {
                newTargetOrders.push(orderToMove);
            }
        } else {
            // Append to end if dropped on column
            newTargetOrders.push(orderToMove);
        }

        // 3. Update State
        if (sourceClusterId === targetClusterId) {
            // Single cluster update
            onUpdateCluster({ ...sourceCluster, orders: newTargetOrders });
        } else {
            // Multi cluster update
            const newSourceCluster = { ...sourceCluster, orders: newSourceOrders };
            const newTargetCluster = { ...targetCluster, orders: newTargetOrders };
            onUpdateClusters([newSourceCluster, newTargetCluster]);
        }
    };

    // --- RE-OPTIMIZE LOGIC ---
    const handleReoptimize = async (cluster: Cluster) => {
        if (!apiKey) {
            alert("Cần có API Key để tối ưu lại.");
            return;
        }

        setIsOptimizing(true);
        try {
            // Use the first order's location or the original centroid as origin if possible, 
            // but ideally we should have the warehouse location. 
            // For now, we'll use the cluster's current centroid or the first order.
            const origin = cluster.centroid;

            // Config for VRP (reusing defaults or we should pass config prop)
            const config = {
                maxOrdersPerShipper: 100, // Allow all orders in this cluster to stay
                costPerKm: 5000,
                costPerPoint: 5000, // Default for re-optimize
                startPoints: [],
                maxClusters: 1,
                currency: 'VND' as const,
                maxKmPerShipper: 500,
                trackAsiaApiKey: apiKey
            };

            const newRoutes = await solveVRP(cluster.orders, origin, apiKey, config);

            if (newRoutes.length > 0) {
                // VRP might return multiple routes if constraints are strict, but here we want to keep it as one cluster if possible.
                // If VRP splits it, we might have to handle that. 
                // For simplicity in this feature, we take the first route or merge them?
                // Actually, solveVRP returns an array of Clusters.

                // Let's assume we just want to update the geometry and sequence of THIS cluster.
                // We take the first result and update our cluster.
                const optimized = newRoutes[0];

                onUpdateCluster({
                    ...cluster,
                    orders: optimized.orders,
                    totalDistanceKm: optimized.totalDistanceKm,
                    estimatedCost: optimized.estimatedCost,
                    geometry: optimized.geometry
                });
                alert(`Đã tối ưu lại chuyến ${cluster.name}!`);
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi khi tối ưu lại tuyến đường.");
        } finally {
            setIsOptimizing(false);
        }
    };

    if (!clusters.length) {
        return <div className="p-10 text-center text-gray-500">Chưa có lộ trình nào được tạo. Vui lòng vào Lập Kế Hoạch.</div>;
    }

    return (
        <div className="flex h-full p-4 gap-4">
            {/* Sidebar List of Clusters */}
            <div className="w-1/4 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col no-print">
                <div className="p-4 border-b border-slate-700 bg-slate-800">
                    <h3 className="font-bold text-white mb-2">Danh sách chuyến xe</h3>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="bg-slate-900 p-2 rounded border border-slate-700">
                            <span className="text-gray-400 block">Tổng số chuyến</span>
                            <span className="text-brand-teal font-bold text-sm">{clusters.length}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-700">
                            <span className="text-gray-400 block">Tổng quãng đường</span>
                            <span className="text-brand-purple font-bold text-sm">
                                {clusters.reduce((acc, c) => acc + c.totalDistanceKm, 0).toFixed(1)} km
                            </span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-700 col-span-2">
                            <span className="text-gray-400 block">Tổng phí vận chuyển</span>
                            <span className="text-white font-bold text-sm">
                                {clusters.reduce((acc, c) => acc + c.estimatedCost, 0).toLocaleString('vi-VN')} đ
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {clusters.map(cluster => {
                        const assignedShipper = shippers.find(s => s.id === cluster.assignedShipperId);
                        return (
                            <div
                                key={cluster.id}
                                onClick={() => setSelectedClusterId(cluster.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedClusterId === cluster.id
                                    ? 'bg-brand-purple/20 border-brand-purple'
                                    : 'bg-slate-800 border-slate-700 hover:border-gray-500'
                                    } ${cluster.isCompleted ? 'opacity-50' : ''}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-white">{cluster.name}</span>
                                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-gray-300">
                                        {cluster.orders.length} đơn hàng
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    {assignedShipper ? assignedShipper.name : 'Chưa gán tài xế'}
                                </div>
                                {cluster.isCompleted && <div className="mt-1 text-xs text-green-400 font-bold">HOÀN THÀNH</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Toolbar */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex justify-between items-center no-print">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-800 rounded p-1">
                            <button
                                onClick={() => setViewMode('MAP')}
                                className={`px-3 py-1 text-sm font-bold rounded ${viewMode === 'MAP' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Bản đồ
                            </button>
                            <button
                                onClick={() => setViewMode('DETAILS')}
                                className={`px-3 py-1 text-sm font-bold rounded ${viewMode === 'DETAILS' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Chi tiết & Phiếu Giao
                            </button>
                            <button
                                onClick={() => setViewMode('KANBAN')}
                                className={`px-3 py-1 text-sm font-bold rounded ${viewMode === 'KANBAN' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Kéo Thả (Kanban)
                            </button>
                        </div>

                        {selectedCluster && (
                            <>
                                <h2 className="text-xl font-bold text-white ml-4">{selectedCluster.name}</h2>
                                {selectedCluster.isCompleted ? (
                                    <span className="px-3 py-1 bg-green-900 text-green-300 text-sm font-bold rounded-full border border-green-700">Hoàn thành</span>
                                ) : (
                                    <button
                                        onClick={completeRoute}
                                        className="px-4 py-1.5 bg-brand-teal text-brand-dark font-bold text-sm rounded hover:bg-teal-400 transition"
                                    >
                                        Đánh dấu hoàn thành
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    {selectedCluster && viewMode === 'DETAILS' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSyncModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition font-bold"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Sync Lark
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                In Phiếu
                            </button>
                        </div>
                    )}
                </div>

                {/* Sync Modal */}
                {showSyncModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">Đồng bộ sang Lark Base</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Base ID</label>
                                    <input id="syncBaseId" type="text" defaultValue="BW7mbi3nEaZlCZsW2Y2lE5JUgNH" className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="bas..." />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Table ID (Routes)</label>
                                    <input id="syncTableId" type="text" defaultValue="tblrv6rCvSV0b60K" className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="tbl..." />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        onClick={() => setShowSyncModal(false)}
                                        className="px-4 py-2 text-gray-400 hover:text-white"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const baseId = (document.getElementById('syncBaseId') as HTMLInputElement).value;
                                            const tableId = (document.getElementById('syncTableId') as HTMLInputElement).value;
                                            if (!baseId || !tableId) return alert('Nhập đủ thông tin!');

                                            try {
                                                const res = await fetch('/api/lark/routes', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        baseId,
                                                        tableId,
                                                        routes: clusters // Sync all clusters
                                                    })
                                                });
                                                const json = await res.json();
                                                if (json.error) throw new Error(json.error);
                                                alert(`Đã đồng bộ ${json.count} chuyến xe!`);
                                                setShowSyncModal(false);
                                            } catch (e: any) {
                                                alert('Lỗi: ' + e.message);
                                            }
                                        }}
                                        className="px-4 py-2 bg-brand-teal text-brand-dark font-bold rounded hover:bg-teal-400"
                                    >
                                        Đồng bộ ngay
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Content */}
                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative">
                    {viewMode === 'MAP' ? (
                        <TrackAsiaMap
                            clusters={clusters}
                            shippers={shippers}
                            apiKey={apiKey}
                            selectedClusterId={selectedClusterId}
                            onSelectCluster={setSelectedClusterId}
                        />
                    ) : viewMode === 'KANBAN' ? (
                        <div className="h-full overflow-x-auto overflow-y-hidden p-4 flex gap-4">
                            {clusters.map(cluster => (
                                <div
                                    key={cluster.id}
                                    className="min-w-[320px] w-[320px] bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, cluster.id)} // Drop on column = append
                                >
                                    {/* Column Header */}
                                    <div className="p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
                                        <div>
                                            <h3 className="font-bold text-white text-sm">{cluster.name}</h3>
                                            <span className="text-xs text-gray-400">{cluster.orders.length} đơn - {cluster.totalDistanceKm} km</span>
                                        </div>
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }}></div>
                                    </div>

                                    {/* Orders List */}
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {cluster.orders.map((order, idx) => (
                                            <div
                                                key={order.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, order.id, cluster.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, cluster.id, order.id)} // Drop on card = insert before
                                                className="bg-slate-700 p-3 rounded border border-slate-600 cursor-move hover:border-brand-teal transition-colors shadow-sm group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-sm text-white">{idx + 1}. {order.customerName}</span>
                                                    <span className="text-xs font-mono text-brand-teal">{order.cod.toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-gray-300 line-clamp-2 mb-1">{order.address}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-gray-400">{order.id}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="p-3 border-t border-slate-700 bg-slate-900/30">
                                        <button
                                            onClick={() => handleReoptimize(cluster)}
                                            disabled={isOptimizing}
                                            className="w-full py-2 bg-brand-purple/20 hover:bg-brand-purple/40 text-brand-purple text-xs font-bold rounded border border-brand-purple/50 transition-colors flex justify-center items-center gap-2"
                                        >
                                            {isOptimizing ? (
                                                <span className="animate-spin">⟳</span>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            )}
                                            Tối ưu lại
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        selectedCluster && (
                            <div className="h-full overflow-y-auto p-4">
                                {/* Editor / Dashboard */}
                                <div className="grid grid-cols-3 gap-4 no-print">
                                    {/* Assignment */}
                                    <div className="col-span-1 bg-slate-800 border border-slate-700 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Gán Tài Xế</h4>
                                        <select
                                            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                            value={selectedCluster.assignedShipperId || ''}
                                            onChange={(e) => handleAssignShipper(e.target.value)}
                                            disabled={selectedCluster.isCompleted}
                                        >
                                            <option value="">-- Chọn Tài Xế --</option>
                                            {shippers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} - {s.licensePlate}</option>
                                            ))}
                                        </select>

                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                            <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Tài chính</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">Tổng quãng đường:</span>
                                                    <span className="text-white font-mono">{selectedCluster.totalDistanceKm} km</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">Phí cơ bản:</span>
                                                    <span className="text-white font-mono">{selectedCluster.estimatedCost.toLocaleString()} đ</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-400">Phụ phí:</span>
                                                    <input
                                                        type="number"
                                                        className="w-24 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-right font-mono text-white text-sm"
                                                        value={selectedCluster.extraFee}
                                                        onChange={(e) => handleExtraFeeChange(Number(e.target.value))}
                                                        disabled={selectedCluster.isCompleted}
                                                    />
                                                </div>
                                                <div className="border-t border-slate-700 my-2"></div>
                                                <div className="flex justify-between text-sm font-bold">
                                                    <span className="text-brand-purple">Tổng cước phí:</span>
                                                    <span className="text-brand-purple font-mono">{(selectedCluster.estimatedCost + selectedCluster.extraFee).toLocaleString()} đ</span>
                                                </div>
                                                <div className="flex justify-between text-sm font-bold">
                                                    <span className="text-brand-teal">Tổng thu hộ (COD):</span>
                                                    <span className="text-brand-teal font-mono">{calculateTotalCod(selectedCluster).toLocaleString()} đ</span>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded flex justify-between text-base font-extrabold mt-2">
                                                    <span className="text-white">PHẢI THU:</span>
                                                    <span className="text-white font-mono">{calculateNetCollection(selectedCluster).toLocaleString()} đ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order List Display */}
                                    <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-0 overflow-hidden flex flex-col">
                                        <div className="p-3 bg-slate-900 border-b border-slate-700">
                                            <h4 className="text-sm font-semibold text-white">Điểm dừng ({selectedCluster.orders.length})</h4>
                                        </div>
                                        <div className="overflow-y-auto flex-1 p-2">
                                            <table className="w-full text-sm text-left text-gray-400">
                                                <thead className="text-xs uppercase bg-slate-900/50 text-gray-500">
                                                    <tr>
                                                        <th className="px-3 py-2">#</th>
                                                        <th className="px-3 py-2">Khách hàng</th>
                                                        <th className="px-3 py-2">Địa chỉ</th>
                                                        <th className="px-3 py-2 text-right">COD</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedCluster.orders.map((order, idx) => (
                                                        <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                                            <td className="px-3 py-2 font-medium text-white">
                                                                {order.customerName}
                                                                <div className="text-xs text-gray-500">{order.phoneNumber}</div>
                                                            </td>
                                                            <td className="px-3 py-2">{order.address}</td>
                                                            <td className="px-3 py-2 text-right font-mono text-brand-teal">{order.cod.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Hidden Printable Area (Same as before) */}
                                {/* Hidden Printable Area - Rebuilt for A4 & Pagination using Portal */}
                                {createPortal(
                                    <div className="print-only">
                                        <div className="print-header">
                                            <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                                                <div>
                                                    <h1 className="text-2xl font-bold uppercase">PHIẾU GIAO HÀNG</h1>
                                                    <p className="text-sm">Chuyến: {selectedCluster.name}</p>
                                                    <p className="text-sm">Ngày: {new Date().toLocaleDateString('vi-VN')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <h2 className="text-lg font-bold">SmartRoute</h2>
                                                    <p className="text-xs">Powered by MindTransform</p>
                                                </div>
                                            </div>

                                            <div className="mb-4 flex justify-between text-sm">
                                                <div className="w-1/2">
                                                    <h3 className="font-bold border-b border-gray-400 mb-1 inline-block">Thông tin tài xế</h3>
                                                    <p>Họ tên: {shippers.find(s => s.id === selectedCluster.assignedShipperId)?.name || '________________'}</p>
                                                    <p>SĐT: {shippers.find(s => s.id === selectedCluster.assignedShipperId)?.phoneNumber || '________________'}</p>
                                                    <p>Biển số: {shippers.find(s => s.id === selectedCluster.assignedShipperId)?.licensePlate || '________________'}</p>
                                                </div>
                                                <div className="w-1/3 text-right">
                                                    <h3 className="font-bold border-b border-gray-400 mb-1 inline-block">Tổng kết</h3>
                                                    <p>Tổng đơn: {selectedCluster.orders.length}</p>
                                                    <p>Tổng COD: {calculateTotalCod(selectedCluster).toLocaleString()} đ</p>
                                                    <p>Thực nộp: <strong>{calculateNetCollection(selectedCluster).toLocaleString()} đ</strong></p>
                                                </div>
                                            </div>
                                        </div>

                                        <table className="print-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '5%' }}>STT</th>
                                                    <th style={{ width: '25%' }}>Khách hàng</th>
                                                    <th style={{ width: '35%' }}>Địa chỉ</th>
                                                    <th style={{ width: '15%' }}>Ghi chú</th>
                                                    <th style={{ width: '10%' }} className="text-right">COD</th>
                                                    <th style={{ width: '10%' }}>Ký nhận</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedCluster.orders.map((order, idx) => (
                                                    <tr key={order.id}>
                                                        <td className="text-center">{idx + 1}</td>
                                                        <td>
                                                            <div className="font-bold">{order.customerName}</div>
                                                            <div className="text-xs">{order.phoneNumber}</div>
                                                        </td>
                                                        <td>{order.address}</td>
                                                        <td className="text-xs">{order.note}</td>
                                                        <td className="text-right">{order.cod.toLocaleString()}</td>
                                                        <td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="print-footer mt-8 flex justify-between text-sm">
                                            <div className="text-center w-1/3">
                                                <p className="mb-8 font-bold">Thủ kho</p>
                                                <div className="border-t border-black mx-4"></div>
                                            </div>
                                            <div className="text-center w-1/3">
                                                <p className="mb-8 font-bold">Tài xế</p>
                                                <div className="border-t border-black mx-4"></div>
                                            </div>
                                        </div>
                                    </div>,
                                    document.getElementById('print-root') || document.body
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};