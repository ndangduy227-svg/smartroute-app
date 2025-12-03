import React, { useState } from 'react';
import { Shipper } from '../types';

interface ShipperManagerProps {
    shippers: Shipper[];
    onAddShipper: (s: Shipper) => void;
    onRemoveShipper: (id: string) => void;
}

export const ShipperManager: React.FC<ShipperManagerProps> = ({ shippers, onAddShipper, onRemoveShipper }) => {
    const [newShipper, setNewShipper] = useState<Partial<Shipper>>({});

    const handleAdd = () => {
        if (newShipper.name && newShipper.phoneNumber) {
            onAddShipper({
                id: `SHIP-${Date.now()}`,
                name: newShipper.name,
                phoneNumber: newShipper.phoneNumber,
                licensePlate: newShipper.licensePlate || '',
                note: newShipper.note || ''
            });
            setNewShipper({});
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto h-full flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-6">Quản Lý Tài Xế</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Form */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 h-fit">
                    <h3 className="text-lg font-semibold text-brand-teal mb-4">Thêm Tài Xế Mới</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Họ và tên *</label>
                            <input
                                type="text"
                                value={newShipper.name || ''}
                                onChange={e => setNewShipper({ ...newShipper, name: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                placeholder="Nguyen Van A"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Số điện thoại *</label>
                            <input
                                type="text"
                                value={newShipper.phoneNumber || ''}
                                onChange={e => setNewShipper({ ...newShipper, phoneNumber: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                placeholder="090..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Biển số xe</label>
                            <input
                                type="text"
                                value={newShipper.licensePlate || ''}
                                onChange={e => setNewShipper({ ...newShipper, licensePlate: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                placeholder="59-X1 123.45"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Ghi chú</label>
                            <textarea
                                value={newShipper.note || ''}
                                onChange={e => setNewShipper({ ...newShipper, note: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                                rows={3}
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            className="w-full bg-brand-teal hover:bg-teal-400 text-brand-dark font-bold py-2 rounded transition-colors"
                        >
                            Lưu Hồ Sơ
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-700 bg-slate-800">
                        <h3 className="font-semibold text-white">Danh sách tài xế ({shippers.length})</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {shippers.length === 0 && <p className="text-gray-500 text-center mt-10">Chưa có tài xế nào.</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {shippers.map(s => (
                                <div key={s.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-brand-purple transition-all relative group">
                                    <button
                                        onClick={() => onRemoveShipper(s.id)}
                                        className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center text-white font-bold">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{s.name}</h4>
                                            <p className="text-xs text-brand-teal">{s.licensePlate}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400 space-y-1">
                                        <p className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            {s.phoneNumber}
                                        </p>
                                        {s.note && <p className="italic text-xs mt-2 border-t border-slate-700 pt-2">"{s.note}"</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};