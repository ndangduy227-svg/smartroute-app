import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Cluster, Shipper } from '../types';
import { User } from 'firebase/auth';
import { FirestoreService } from '../services/FirestoreService';

interface HistoryViewProps {
    clusters: Cluster[];
    shippers: Shipper[];
    user: User | null;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ clusters: propClusters, shippers, user }) => {
    const [filterDate, setFilterDate] = useState('');
    const [filterText, setFilterText] = useState('');
    const [historyClusters, setHistoryClusters] = useState<Cluster[]>([]);

    React.useEffect(() => {
        if (user) {
            const fetchHistory = async () => {
                const data = await FirestoreService.getHistory(user.uid);
                // Flatten data: History documents contain { clusters: Cluster[] }
                // @ts-ignore
                const flatClusters = data.flatMap(d => d.clusters || []);
                setHistoryClusters(flatClusters);
            };
            fetchHistory();
        }
    }, [user]);

    // Merge Prop Clusters (Current Session) with History Clusters (Firestore)
    // Remove duplicates if any (by ID)
    const allClusters = [...propClusters, ...historyClusters];
    const uniqueClusters = Array.from(new Map(allClusters.map(c => [c.id, c])).values());

    const filteredClusters = uniqueClusters.filter(c => {
        if (!c.isReconciled) return false;

        // Date Filter (using createdAt timestamp)
        if (filterDate) {
            const date = new Date(c.createdAt).toISOString().split('T')[0];
            if (date !== filterDate) return false;
        }

        // Text Filter (Cluster Name, Shipper Name, Order Customer/Address)
        if (filterText) {
            const text = filterText.toLowerCase();
            const shipperName = shippers.find(s => s.id === c.assignedShipperId)?.name.toLowerCase() || '';
            const hasOrderMatch = c.orders.some(o =>
                o.customerName.toLowerCase().includes(text) ||
                o.address.toLowerCase().includes(text) ||
                o.id.toLowerCase().includes(text)
            );

            return c.name.toLowerCase().includes(text) || shipperName.includes(text) || hasOrderMatch;
        }

        return true;
    });

    const handleExportExcel = () => {
        // Flatten data: 1 row per order
        const rows: any[] = [];

        filteredClusters.forEach(c => {
            const shipperName = shippers.find(s => s.id === c.assignedShipperId)?.name || 'N/A';
            const date = new Date(c.createdAt).toLocaleDateString('vi-VN');

            c.orders.forEach(o => {
                rows.push({
                    'Ngày tạo': date,
                    'Tên Chuyến': c.name,
                    'Tài Xế': shipperName,
                    'Mã Đơn': o.id,
                    'Khách Hàng': o.customerName,
                    'Số ĐT': o.phoneNumber,
                    'Địa Chỉ': o.address,
                    'COD': o.cod,
                    'Ghi Chú': o.note,
                    'Trạng Thái': o.status
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lich_Su_Giao_Hang");
        XLSX.writeFile(wb, `Lich_Su_Giao_Hang_${new Date().getTime()}.xlsx`);
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <svg className="w-8 h-8 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Lịch Sử Đơn Hàng
                </h2>
                <button
                    onClick={handleExportExcel}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Xuất Excel
                </button>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6 flex gap-4">
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Ngày tạo</label>
                    <input
                        type="date"
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Tìm kiếm (Tên chuyến, KH, Đơn hàng...)</label>
                    <input
                        type="text"
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm w-full"
                        placeholder="Nhập từ khóa..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                    {filteredClusters.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">Không tìm thấy dữ liệu phù hợp.</div>
                    ) : (
                        filteredClusters.map(c => (
                            <div key={c.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                                <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-white">{c.name}</h3>
                                        <p className="text-xs text-gray-400">
                                            {new Date(c.createdAt).toLocaleString('vi-VN')} •
                                            Shipper: {shippers.find(s => s.id === c.assignedShipperId)?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-brand-teal font-mono font-bold">{c.orders.reduce((sum, o) => sum + o.cod, 0).toLocaleString()} đ</div>
                                        <div className="text-xs text-gray-500">Tổng COD</div>
                                    </div>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="text-xs uppercase bg-slate-900 text-gray-500">
                                            <tr>
                                                <th className="px-4 py-2">Mã Đơn</th>
                                                <th className="px-4 py-2">Khách Hàng</th>
                                                <th className="px-4 py-2">Địa Chỉ</th>
                                                <th className="px-4 py-2 text-right">COD</th>
                                                <th className="px-4 py-2 text-center">Trạng Thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {c.orders.map(o => (
                                                <tr key={o.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                                                    <td className="px-4 py-2 font-mono text-xs">{o.id.split('-')[1] || o.id}</td>
                                                    <td className="px-4 py-2 text-white">{o.customerName}</td>
                                                    <td className="px-4 py-2 truncate max-w-xs">{o.address}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{o.cod.toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <span className={`text-xs font-bold ${o.status === 'completed' ? 'text-green-400' :
                                                            o.status === 'failed' ? 'text-red-400' :
                                                                'text-yellow-400'
                                                            }`}>
                                                            {o.status === 'completed' ? 'Hoàn thành' : o.status === 'failed' ? 'Thất bại' : o.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
