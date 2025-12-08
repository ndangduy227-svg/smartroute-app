
import React, { useState } from 'react';
import { BRAND_LOGOS } from './constants';
import { ImportView } from './components/ImportView';
import { PlanningView } from './components/PlanningView';
import { ResultsView } from './components/ResultsView';
import { ReconciliationView } from './components/ReconciliationView';
import { HistoryView } from './components/HistoryView';
import { ShipperManager } from './components/ShipperManager';
import { UserGuide } from './components/UserGuide';
import { AuthProvider } from './components/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ViewState, Order, Shipper, Cluster, OrderStatus, Coordinate } from './types';

// Icons
const Icons = {
    Upload: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
    Users: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Map: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 7m0 13V7" /></svg>,
    Truck: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
    Check: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    History: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

const App: React.FC = () => {
    // Global State
    const [view, setView] = useState<ViewState>('IMPORT');
    const [showGuide, setShowGuide] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [shippers, setShippers] = useState<Shipper[]>([
        { id: 's1', name: 'Le Van Minh', phoneNumber: '090111222', licensePlate: '59-S1 12345', note: 'Morning shift' },
        { id: 's2', name: 'Nguyen Thi Ha', phoneNumber: '090333444', licensePlate: '59-T2 67890', note: '' },
    ]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [warehouse, setWarehouse] = useState<Coordinate | null>(null); // Lifted state

    const handleOrdersImported = (newOrders: Order[]) => {
        setOrders(newOrders);
        setView('PLANNING');
    };

    const handleClustersGenerated = (newClusters: Cluster[]) => {
        // Mark orders as Routed
        const routedOrderIds = new Set<string>();
        newClusters.forEach(c => c.orders.forEach(o => routedOrderIds.add(o.id)));

        setOrders(orders.map(o => routedOrderIds.has(o.id) ? { ...o, status: OrderStatus.ROUTED } : o));
        setClusters(newClusters);
        setView('RESULTS');
    };

    const handleUpdateCluster = (updated: Cluster) => {
        setClusters(clusters.map(c => c.id === updated.id ? updated : c));
    };

    const handleUpdateClusters = (updatedClusters: Cluster[]) => {
        const updatedMap = new Map(updatedClusters.map(c => [c.id, c]));
        setClusters(clusters.map(c => updatedMap.get(c.id) || c));
    };

    const handleCompleteClusters = (completed: Cluster[]) => {
        // Logic for moving to history would go here
        const completedIds = new Set(completed.map(c => c.id));
        setClusters(clusters.map(c => completedIds.has(c.id) ? { ...c, isCompleted: true } : c));
        // In a real app, update individual order status to COMPLETED
    };

    const handleFinalizeCluster = (clusterId: string) => {
        setClusters(clusters.map(c => c.id === clusterId ? { ...c, isReconciled: true } : c));
    };

    const handleDeleteCluster = (clusterId: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa chuyến xe này không?')) {
            setClusters(clusters.filter(c => c.id !== clusterId));
        }
    };

    return (
        <AuthProvider>
            <ProtectedRoute>
                <div className="flex min-h-screen bg-brand-dark text-slate-100 font-sans">
                    {/* Sidebar */}
                    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10 no-print">
                        <div className="p-6">
                            <div className="transform scale-90 origin-left">
                                {BRAND_LOGOS.smartRoute_full}
                            </div>
                        </div>

                        <nav className="flex-1 px-4 space-y-2 mt-4">
                            <button
                                onClick={() => setView('IMPORT')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'IMPORT' ? 'bg-brand-teal text-brand-dark font-bold shadow-[0_0_15px_rgba(45,225,194,0.3)]' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Icons.Upload />
                                Import Đơn Hàng
                            </button>
                            <button
                                onClick={() => setView('PLANNING')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'PLANNING' ? 'bg-brand-teal text-brand-dark font-bold shadow-[0_0_15px_rgba(45,225,194,0.3)]' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Icons.Map />
                                Lập Kế Hoạch
                            </button>
                            <button
                                onClick={() => setView('RESULTS')}
                                disabled={clusters.length === 0}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'RESULTS' ? 'bg-brand-teal text-brand-dark font-bold shadow-[0_0_15px_rgba(45,225,194,0.3)]' : clusters.length === 0 ? 'opacity-50 cursor-not-allowed text-gray-600' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Icons.Truck />
                                Kết Quả Lộ Trình
                            </button>
                            <button
                                onClick={() => setView('RECONCILIATION')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'RECONCILIATION' ? 'bg-brand-teal text-brand-dark font-bold shadow-[0_0_15px_rgba(45,225,194,0.3)]' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Icons.Check />
                                Đối Soát
                            </button>
                            <div className="h-px bg-slate-800 my-4 mx-2"></div>
                            <button
                                onClick={() => setView('SHIPPERS')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'SHIPPERS' ? 'bg-brand-teal text-brand-dark font-bold shadow-[0_0_15px_rgba(45,225,194,0.3)]' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Icons.Users />
                                Quản Lý Tài Xế
                            </button>
                            <button
                                onClick={() => setView('HISTORY')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'HISTORY' ? 'bg-brand-teal text-brand-dark font-bold shadow-[0_0_15px_rgba(45,225,194,0.3)]' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Icons.History />
                                Lịch Sử Đơn Hàng
                            </button>

                            <div className="mt-auto pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => setShowGuide(true)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-purple hover:bg-slate-800 hover:text-white transition-all font-bold"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Hướng dẫn sử dụng
                                </button>
                            </div>
                        </nav>

                        <div className="p-6 border-t border-slate-800">
                            <div className="bg-slate-800 rounded-lg p-3">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Trạng Thái</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-300">Chờ xử lý</span>
                                    <span className="text-brand-teal font-mono">{orders.filter(o => o.status === OrderStatus.PENDING).length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="text-gray-300">Đã điều phối</span>
                                    <span className="text-brand-purple font-mono">{orders.filter(o => o.status === OrderStatus.ROUTED).length}</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="ml-64 flex-1 h-screen overflow-hidden relative">
                        {/* Background Gradients */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none no-print">
                            <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl"></div>
                        </div>

                        <div className="relative z-0 h-full overflow-y-auto">
                            {view === 'IMPORT' && <ImportView onOrdersImported={handleOrdersImported} />}

                            {view === 'PLANNING' && (
                                <PlanningView
                                    orders={orders}
                                    shippers={shippers}
                                    onClustersGenerated={handleClustersGenerated}
                                    warehouse={warehouse}
                                    setWarehouse={setWarehouse}
                                />
                            )}

                            {view === 'RESULTS' && (
                                <ResultsView
                                    clusters={clusters.filter(c => !c.isCompleted)}
                                    shippers={shippers}
                                    onComplete={handleCompleteClusters}
                                    onUpdateCluster={handleUpdateCluster}
                                    onUpdateClusters={handleUpdateClusters}
                                    onDeleteCluster={handleDeleteCluster}
                                    warehouse={warehouse}
                                />
                            )}

                            {view === 'RECONCILIATION' && (
                                <ReconciliationView
                                    clusters={clusters.filter(c => c.isCompleted && !c.isReconciled)}
                                    onUpdateCluster={handleUpdateCluster}
                                    onFinalizeCluster={handleFinalizeCluster}
                                />
                            )}

                            {view === 'SHIPPERS' && (
                                <ShipperManager
                                    shippers={shippers}
                                    onAddShipper={(s) => setShippers([...shippers, s])}
                                    onRemoveShipper={(id) => setShippers(shippers.filter(s => s.id !== id))}
                                />
                            )}

                            {view === 'HISTORY' && (
                                <HistoryView
                                    clusters={clusters}
                                    shippers={shippers}
                                />
                            )}
                        </div>
                    </main>

                    <UserGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
                </div>
            </ProtectedRoute>
        </AuthProvider>
    );
};

export default App;