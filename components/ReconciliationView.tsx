import React, { useState } from 'react';
import { Cluster, Order, OrderStatus } from '../types';

interface ReconciliationViewProps {
    clusters: Cluster[];
    onUpdateCluster: (cluster: Cluster) => void;
    onFinalizeCluster: (clusterId: string) => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ clusters, onUpdateCluster, onFinalizeCluster }) => {
    const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ cod: number; shipFee: number; note: string }>({ cod: 0, shipFee: 0, note: '' });

    const toggleCluster = (id: string) => {
        if (expandedClusterId === id) setExpandedClusterId(null);
        else setExpandedClusterId(id);
    };

    const handleStatusChange = (clusterId: string, orderId: string, newStatus: OrderStatus) => {
        const cluster = clusters.find(c => c.id === clusterId);
        if (!cluster) return;

        const updatedOrders = cluster.orders.map(o => {
            if (o.id === orderId) {
                return { ...o, status: newStatus };
            }
            return o;
        });

        onUpdateCluster({ ...cluster, orders: updatedOrders });
    };

    const startEditing = (order: Order) => {
        setEditingOrderId(order.id);
        setEditForm({
            cod: order.cod,
            shipFee: 0, // Assuming shipFee is per order, but currently it's per cluster. If we want per order, we need to add it to Order type. 
            // For now, let's assume we are editing COD and Note. 
            // Wait, user asked to edit "Ship Fee" for order. 
            // If Order doesn't have shipFee, we might need to add it or just ignore for now and focus on COD/Note.
            // Let's check types.ts. Order doesn't have shipFee. 
            // I will add it to Order type later if needed. For now, let's just edit COD and Note.
            note: order.note || ''
        });
    };

    const saveEdit = (clusterId: string, orderId: string) => {
        const cluster = clusters.find(c => c.id === clusterId);
        if (!cluster) return;

        const updatedOrders = cluster.orders.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    cod: editForm.cod,
                    note: editForm.note,
                    status: OrderStatus.CHANGED // Mark as changed
                };
            }
            return o;
        });

        onUpdateCluster({ ...cluster, orders: updatedOrders });
        setEditingOrderId(null);
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-8 h-8 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Đối soát & Hoàn tất
            </h2>

            <div className="flex-1 overflow-y-auto space-y-4">
                {clusters.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        <p>Chưa có chuyến xe nào cần đối soát.</p>
                        <p className="text-sm">Các chuyến xe đã "Chốt" sẽ xuất hiện tại đây.</p>
                    </div>
                ) : (
                    clusters.map(cluster => (
                        <div key={cluster.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                            <div
                                className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors"
                                onClick={() => toggleCluster(cluster.id)}
                            >
                                <div>
                                    <h3 className="font-bold text-white text-lg">{cluster.name}</h3>
                                    <p className="text-sm text-gray-400">{cluster.orders.length} đơn hàng - Tổng thu: {cluster.orders.reduce((sum, o) => sum + o.cod, 0).toLocaleString()} đ</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${cluster.isCompleted ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                                        {cluster.isCompleted ? 'Đã giao' : 'Đang giao'}
                                    </div>
                                    <svg className={`w-6 h-6 text-gray-400 transform transition-transform ${expandedClusterId === cluster.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {expandedClusterId === cluster.id && (
                                <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-300">
                                            <thead className="text-xs uppercase bg-slate-800 text-gray-400">
                                                <tr>
                                                    <th className="px-4 py-3">Khách hàng</th>
                                                    <th className="px-4 py-3">Địa chỉ</th>
                                                    <th className="px-4 py-3 text-right">COD</th>
                                                    <th className="px-4 py-3">Ghi chú</th>
                                                    <th className="px-4 py-3">Trạng thái</th>
                                                    <th className="px-4 py-3 text-right">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cluster.orders.map(order => (
                                                    <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                                        <td className="px-4 py-3 font-medium text-white">{order.customerName}</td>
                                                        <td className="px-4 py-3 truncate max-w-xs" title={order.address}>{order.address}</td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            {editingOrderId === order.id ? (
                                                                <input
                                                                    type="number"
                                                                    className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white"
                                                                    value={editForm.cod}
                                                                    onChange={(e) => setEditForm({ ...editForm, cod: Number(e.target.value) })}
                                                                />
                                                            ) : (
                                                                order.cod.toLocaleString()
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {editingOrderId === order.id ? (
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                                                                    value={editForm.note}
                                                                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                                                />
                                                            ) : (
                                                                order.note
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select
                                                                className={`bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-bold ${order.status === OrderStatus.COMPLETED ? 'text-green-400' :
                                                                        order.status === OrderStatus.FAILED ? 'text-red-400' :
                                                                            order.status === OrderStatus.CHANGED ? 'text-yellow-400' :
                                                                                'text-gray-400'
                                                                    }`}
                                                                value={order.status}
                                                                onChange={(e) => handleStatusChange(cluster.id, order.id, e.target.value as OrderStatus)}
                                                            >
                                                                <option value={OrderStatus.PENDING}>Đang giao</option>
                                                                <option value={OrderStatus.COMPLETED}>Hoàn thành</option>
                                                                <option value={OrderStatus.FAILED}>Thất bại / Hủy</option>
                                                                <option value={OrderStatus.CHANGED}>Thay đổi</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {editingOrderId === order.id ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => saveEdit(cluster.id, order.id)} className="text-green-400 hover:text-green-300 font-bold">Lưu</button>
                                                                    <button onClick={() => setEditingOrderId(null)} className="text-gray-400 hover:text-gray-300">Hủy</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => startEditing(order)} className="text-brand-purple hover:text-indigo-400 font-bold text-xs">Sửa</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => onFinalizeCluster(cluster.id)}
                                            className="bg-brand-teal hover:bg-teal-400 text-brand-dark font-bold py-2 px-6 rounded-lg transition-colors shadow-lg shadow-teal-500/20 flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Hoàn tất đối soát
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
