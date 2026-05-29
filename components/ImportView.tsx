
import React, { useState, useCallback } from 'react';
import { RawOrder, Order, OrderStatus, FieldMapping } from '../types';
import { MOCK_ORDERS_CSV } from '../constants';
import { ImportGuideModal, GuideType } from './ImportGuideModal';
import { apiFetch } from '../utils/api';

// @ts-ignore
import * as XLSX from 'xlsx';

interface ImportViewProps {
    onOrdersImported: (orders: Order[]) => void;
}

export const ImportView: React.FC<ImportViewProps> = ({ onOrdersImported }) => {
    const [headers, setHeaders] = useState<string[]>([]);
    const [parsedRows, setParsedRows] = useState<RawOrder[]>([]);
    const [mapping, setMapping] = useState<FieldMapping>({
        customerName: '',
        phoneNumber: '',
        address: '',
        note: '',
        cod: ''
    });
    const [step, setStep] = useState<1 | 2>(1); // 1: Upload, 2: Map
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // API Inputs
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [larkConfig, setLarkConfig] = useState({ appId: '', appSecret: '', baseId: '', tableId: '' });
    const [posCakeConfig, setPosCakeConfig] = useState({ apiKey: '', shopId: '' });
    const [kiotvietConfig, setKiotvietConfig] = useState({ clientId: '', clientSecret: '', retailer: '' });
    const [nhanhConfig, setNhanhConfig] = useState({ appId: '', businessId: '', accessToken: '' });

    // Guide Modal State
    const [guideType, setGuideType] = useState<GuideType | null>(null);

    const processFile = async (file: File) => {
        setErrorMsg('');
        setFileName(file.name);

        // Validation: Size Limit (5MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            setErrorMsg('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
            return;
        }

        // Validation: File Type
        const allowedExtensions = /\.(xlsx|xls|csv|txt)$/i;
        if (!file.name.match(allowedExtensions)) {
            setErrorMsg('Định dạng file không hợp lệ. Chỉ chấp nhận .xlsx, .xls, .csv, .txt');
            return;
        }

        try {
            if (file.name.match(/\.(xlsx|xls)$/)) {
                // Handle Excel
                const buffer = await file.arrayBuffer();
                // Fix: Specify type: 'array' for ArrayBuffer inputs
                const workbook = XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Get headers (first row) and data
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    setErrorMsg('File is empty or missing headers.');
                    return;
                }

                const headerRow = jsonData[0] as string[];
                const dataRows = jsonData.slice(1) as any[][];

                setHeaders(headerRow.map(h => String(h).trim()));

                const rawOrders: RawOrder[] = dataRows.map((row, idx) => {
                    const raw: RawOrder = { id: `raw-${idx}` };
                    headerRow.forEach((h, i) => {
                        // Safe access to row index
                        raw[String(h).trim()] = row[i] !== undefined ? row[i] : '';
                    });
                    return raw;
                });

                setParsedRows(rawOrders);
                suggestMapping(headerRow);
                setStep(2);

            } else {
                // Handle CSV / Text
                const text = await file.text();
                parseCSV(text);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Error parsing file. Please check the format.');
        }
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const loadDemoData = () => {
        setFileName('demo_data.csv');
        parseCSV(MOCK_ORDERS_CSV);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return;

        // Detect delimiter (comma or tab)
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';

        const headerLine = lines[0].split(delimiter);
        const headerRow = headerLine.map(h => h.trim());
        setHeaders(headerRow);

        const dataRows = lines.slice(1).map((line, idx) => {
            const values = line.split(delimiter);
            const row: RawOrder = { id: `raw-${idx}` };
            headerRow.forEach((h, i) => {
                row[h] = values[i]?.trim();
            });
            return row;
        });

        setParsedRows(dataRows);
        suggestMapping(headerRow);
        setStep(2);
    };

    const handleGoogleSheetImport = async () => {
        if (!googleSheetUrl.trim()) {
            setErrorMsg("Vui lòng nhập URL Web App của Google Apps Script.");
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            const response = await fetch(googleSheetUrl);
            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("Dữ liệu trả về không phải là mảng JSON.");
            }

            if (data.length === 0) {
                setErrorMsg("Không tìm thấy dữ liệu.");
                return;
            }

            // Extract headers from the first object
            const headerRow = Object.keys(data[0]);
            setHeaders(headerRow);

            const rawOrders: RawOrder[] = data.map((item: any, idx: number) => {
                const raw: RawOrder = { id: `gsheet-${idx}` };
                headerRow.forEach(h => {
                    raw[h] = typeof item[h] === 'object' ? JSON.stringify(item[h]) : String(item[h] || '');
                });
                return raw;
            });

            setParsedRows(rawOrders);
            setFileName('Google Sheet Data');
            suggestMapping(headerRow);
            setStep(2);

        } catch (error: any) {
            console.error(error);
            setErrorMsg("Lỗi import Google Sheet: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const suggestMapping = (headerList: string[]) => {
        const newMapping = { ...mapping };
        headerList.forEach(h => {
            const lower = String(h).toLowerCase();
            if (lower.includes('name') || lower.includes('tên')) newMapping.customerName = h;
            if (lower.includes('phone') || lower.includes('contact') || lower.includes('sđt') || lower.includes('điện thoại')) newMapping.phoneNumber = h;
            if (lower.includes('address') || lower.includes('địa chỉ')) newMapping.address = h;
            if (lower.includes('note') || lower.includes('ghi chú')) newMapping.note = h;
            if (lower.includes('cod') || lower.includes('amount') || lower.includes('thu') || lower.includes('tiền')) newMapping.cod = h;
        });
        setMapping(newMapping);
    };

    const handleConfirmMapping = () => {
        const importedOrders: Order[] = parsedRows.map((row, idx) => {
            const codVal = row[mapping.cod];
            const parsedCod = typeof codVal === 'string' ? parseFloat(codVal.replace(/[^0-9.]/g, '')) : Number(codVal);

            return {
                id: `ORD-${Date.now()}-${idx}`,
                customerName: String(row[mapping.customerName] || ''),
                phoneNumber: String(row[mapping.phoneNumber] || ''),
                address: String(row[mapping.address] || ''),
                note: String(row[mapping.note] || ''),
                cod: isNaN(parsedCod) ? 0 : parsedCod,
                status: OrderStatus.PENDING,
                originalData: row
            };
        });
        onOrdersImported(importedOrders);
    };

    const handleDownloadSample = () => {
        const headers = ['Customer Name', 'Phone Number', 'Address', 'Note', 'COD'];
        const data = [
            ['Nguyễn Văn A', '0901234567', '123 Lê Lợi, Quận 1, TP.HCM', 'Giao giờ hành chính', 500000],
            ['Trần Thị B', '0912345678', '456 Nguyễn Trãi, Quận 5, TP.HCM', 'Gọi trước khi giao', 0],
            ['Lê Văn C', '0987654321', '789 Điện Biên Phủ, Bình Thạnh, TP.HCM', '', 1200000]
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Import_Don_Hang");
        XLSX.writeFile(wb, "Mau_Import_Don_Hang.xlsx");
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Nhập Đơn Hàng</h2>

            {step === 1 && (
                <div
                    className={`bg-slate-900 border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging ? 'border-brand-teal bg-slate-800' : 'border-slate-700 hover:border-slate-500'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="mb-6 pointer-events-none">
                        <svg className={`mx-auto h-16 w-16 transition-colors ${isDragging ? 'text-brand-teal' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-4 text-xl font-medium text-white">Kéo thả file vào đây</h3>
                        <p className="mt-2 text-sm text-gray-400">Hỗ trợ Excel (.xlsx, .xls) và CSV (.csv, .txt)</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-300 rounded text-sm">
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex justify-center gap-4">
                        <label className="relative cursor-pointer bg-brand-teal hover:bg-teal-400 text-brand-dark font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-teal-500/20">
                            <span>Chọn File</span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".csv,.txt,.xlsx,.xls"
                                onChange={handleFileUpload}
                            />
                        </label>
                        <button
                            onClick={handleDownloadSample}
                            className="bg-transparent border border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Tải file mẫu
                        </button>
                    </div>


                </div>
            )}

            {/* --- PLATFORM CONNECTIONS --- */}
            {step === 1 && (
                <div className="mt-8 space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                        <svg className="w-5 h-5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <h4 className="text-white text-sm font-bold uppercase tracking-wider">Import tu nen tang</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* Google Sheet */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 hover:border-green-500/40 transition-all group p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-white font-bold text-sm">Google Sheet</h5>
                                    <p className="text-gray-500 text-xs">Apps Script Web App</p>
                                </div>
                                <button onClick={() => setGuideType('GSHEET')} className="text-green-400/60 hover:text-green-400 p-1.5 hover:bg-green-500/10 rounded-lg transition-colors" title="Huong dan">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500/20 outline-none placeholder-gray-500" placeholder="Dan URL Web App..." value={googleSheetUrl} onChange={(e) => setGoogleSheetUrl(e.target.value)} />
                                <button onClick={handleGoogleSheetImport} disabled={loading} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs transition-colors">{loading ? 'Dang tai...' : 'Import'}</button>
                            </div>
                        </div>

                        {/* Lark Base */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500/40 transition-all group p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-white font-bold text-sm">Lark Base</h5>
                                    <p className="text-gray-500 text-xs">Feishu / Lark Suite</p>
                                </div>
                                <button onClick={() => setGuideType('LARK')} className="text-blue-400/60 hover:text-blue-400 p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors" title="Huong dan">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none placeholder-gray-500" placeholder="Base ID..." value={larkConfig.baseId} onChange={(e) => setLarkConfig({ ...larkConfig, baseId: e.target.value })} />
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none placeholder-gray-500" placeholder="Table ID..." value={larkConfig.tableId} onChange={(e) => setLarkConfig({ ...larkConfig, tableId: e.target.value })} />
                                <button onClick={async () => { if (!larkConfig.baseId || !larkConfig.tableId) { setErrorMsg('Vui long nhap Base ID va Table ID'); return; } setLoading(true); setErrorMsg(''); try { const res = await apiFetch(`/api/lark/orders?baseId=${larkConfig.baseId}&tableId=${larkConfig.tableId}`); const json = await res.json(); if (json.error) throw new Error(json.error); const items = json.data; if (!items || items.length === 0) { setErrorMsg('Khong tim thay du lieu trong bang nay.'); return; } const allKeys = new Set<string>(); items.forEach((item: any) => { Object.keys(item.fields).forEach(k => allKeys.add(k)); }); const headerRow = Array.from(allKeys); const rawOrders: RawOrder[] = items.map((item: any, idx: number) => { const raw: RawOrder = { id: `lark-${idx}` }; headerRow.forEach(h => { const val = item.fields[h]; raw[h] = typeof val === 'object' ? JSON.stringify(val) : String(val || ''); }); return raw; }); setHeaders(headerRow); setParsedRows(rawOrders); setFileName(`Lark Base: ${larkConfig.tableId}`); suggestMapping(headerRow); setStep(2); } catch (err: any) { setErrorMsg('Loi ket noi Lark: ' + err.message); } finally { setLoading(false); } }} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs transition-colors">{loading ? 'Dang tai...' : 'Ket noi Lark'}</button>
                            </div>
                        </div>

                        {/* POSCake */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 hover:border-teal-500/40 transition-all group p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546m18-3.046c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 12.5m9-8.5v4" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-white font-bold text-sm">Pancake POS</h5>
                                    <p className="text-gray-500 text-xs">POSCake / Pancake</p>
                                </div>
                                <button onClick={() => setGuideType('POSCAKE')} className="text-teal-400/60 hover:text-teal-400 p-1.5 hover:bg-teal-500/10 rounded-lg transition-colors" title="Huong dan">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none placeholder-gray-500" placeholder="API Key..." value={posCakeConfig.apiKey} onChange={(e) => setPosCakeConfig({ ...posCakeConfig, apiKey: e.target.value })} />
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none placeholder-gray-500" placeholder="Shop ID..." value={posCakeConfig.shopId} onChange={(e) => setPosCakeConfig({ ...posCakeConfig, shopId: e.target.value })} />
                                <button onClick={async () => { if (!posCakeConfig.apiKey || !posCakeConfig.shopId) { setErrorMsg('Vui long nhap API Key va Shop ID'); return; } setLoading(true); setErrorMsg(''); try { const response = await apiFetch('/api/poscake/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: posCakeConfig.shopId, token: posCakeConfig.apiKey }) }); const data = await response.json(); if (data.error) throw new Error(data.error); const newOrders = data.data.map((r: any) => ({ id: r.id, address: r.address, lat: 0, lng: 0, weight: r.weight || 1, cod: r.cod || 0, customerName: r.customerName, status: 'pending' })); const headerRow = ['id', 'customerName', 'address', 'weight', 'cod', 'status']; setHeaders(headerRow); const rawOrders = newOrders.map((o: any, idx: number) => ({ id: `pos-${idx}`, ...o, weight: String(o.weight), cod: String(o.cod) })); setParsedRows(rawOrders); setFileName(`POSCake: ${posCakeConfig.shopId}`); setMapping({ customerName: 'customerName', phoneNumber: 'phoneNumber', address: 'address', note: 'note', cod: 'cod' }); setStep(2); } catch (error: any) { setErrorMsg('Loi POSCake: ' + error.message); } finally { setLoading(false); } }} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs transition-colors">{loading ? 'Dang tai...' : 'Ket noi'}</button>
                            </div>
                        </div>

                        {/* KiotViet */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 hover:border-orange-500/40 transition-all group p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-white font-bold text-sm">KiotViet</h5>
                                    <p className="text-gray-500 text-xs">Quan ly ban hang</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none placeholder-gray-500" placeholder="Client ID..." value={kiotvietConfig.clientId} onChange={(e) => setKiotvietConfig({ ...kiotvietConfig, clientId: e.target.value })} />
                                <input type="password" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none placeholder-gray-500" placeholder="Client Secret..." value={kiotvietConfig.clientSecret} onChange={(e) => setKiotvietConfig({ ...kiotvietConfig, clientSecret: e.target.value })} />
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none placeholder-gray-500" placeholder="Ten cua hang (Retailer)..." value={kiotvietConfig.retailer} onChange={(e) => setKiotvietConfig({ ...kiotvietConfig, retailer: e.target.value })} />
                                <button onClick={async () => { if (!kiotvietConfig.clientId || !kiotvietConfig.clientSecret || !kiotvietConfig.retailer) { setErrorMsg('Vui long nhap day du thong tin KiotViet'); return; } setLoading(true); setErrorMsg(''); try { const response = await apiFetch('/api/kiotviet/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kiotvietConfig) }); const data = await response.json(); if (data.error) throw new Error(data.error); const orders = data.data || []; if (orders.length === 0) { setErrorMsg('Khong tim thay don hang tren KiotViet.'); return; } const headerRow = ['id', 'customerName', 'phoneNumber', 'address', 'note', 'cod', 'status']; setHeaders(headerRow); const rawOrders = orders.map((o: any, idx: number) => ({ id: `kv-${idx}`, ...o, cod: String(o.cod || 0) })); setParsedRows(rawOrders); setFileName(`KiotViet: ${kiotvietConfig.retailer}`); setMapping({ customerName: 'customerName', phoneNumber: 'phoneNumber', address: 'address', note: 'note', cod: 'cod' }); setStep(2); } catch (error: any) { setErrorMsg('Loi KiotViet: ' + error.message); } finally { setLoading(false); } }} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs transition-colors">{loading ? 'Dang tai...' : 'Ket noi KiotViet'}</button>
                            </div>
                        </div>

                        {/* Nhanh.vn */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 hover:border-sky-500/40 transition-all group p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-white font-bold text-sm">Nhanh.vn</h5>
                                    <p className="text-gray-500 text-xs">Quan ly ban hang online</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder-gray-500" placeholder="App ID..." value={nhanhConfig.appId} onChange={(e) => setNhanhConfig({ ...nhanhConfig, appId: e.target.value })} />
                                <input type="text" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder-gray-500" placeholder="Business ID..." value={nhanhConfig.businessId} onChange={(e) => setNhanhConfig({ ...nhanhConfig, businessId: e.target.value })} />
                                <input type="password" className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder-gray-500" placeholder="Access Token..." value={nhanhConfig.accessToken} onChange={(e) => setNhanhConfig({ ...nhanhConfig, accessToken: e.target.value })} />
                                <button onClick={async () => { if (!nhanhConfig.appId || !nhanhConfig.businessId || !nhanhConfig.accessToken) { setErrorMsg('Vui long nhap day du thong tin Nhanh.vn'); return; } setLoading(true); setErrorMsg(''); try { const response = await apiFetch('/api/nhanh/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nhanhConfig) }); const data = await response.json(); if (data.error) throw new Error(data.error); const orders = data.data || []; if (orders.length === 0) { setErrorMsg('Khong tim thay don hang tren Nhanh.vn.'); return; } const headerRow = ['id', 'customerName', 'phoneNumber', 'address', 'note', 'cod', 'status']; setHeaders(headerRow); const rawOrders = orders.map((o: any, idx: number) => ({ id: `nhanh-${idx}`, ...o, cod: String(o.cod || 0) })); setParsedRows(rawOrders); setFileName(`Nhanh.vn: ${nhanhConfig.businessId}`); setMapping({ customerName: 'customerName', phoneNumber: 'phoneNumber', address: 'address', note: 'note', cod: 'cod' }); setStep(2); } catch (error: any) { setErrorMsg('Loi Nhanh.vn: ' + error.message); } finally { setLoading(false); } }} disabled={loading} className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs transition-colors">{loading ? 'Dang tai...' : 'Ket noi Nhanh.vn'}</button>
                            </div>
                        </div>

                    </div>
                </div>
            )}


            {/* Guide Modal */}
            {
                guideType && (
                    <ImportGuideModal
                        isOpen={!!guideType}
                        onClose={() => setGuideType(null)}
                        type={guideType}
                    />
                )
            }

            {
                step === 2 && (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-brand-teal">Ánh xạ cột dữ liệu</h3>
                                <p className="text-gray-400 text-sm">Tệp: {fileName}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                                Tìm thấy {parsedRows.length} dòng
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.keys(mapping).map((field) => (
                                <div key={field} className="flex flex-col">
                                    <label className="mb-2 text-sm font-medium text-gray-300 capitalize">
                                        {field.replace(/([A-Z])/g, ' $1').trim()} <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={mapping[field as keyof FieldMapping]}
                                        onChange={(e) => setMapping({ ...mapping, [field as keyof FieldMapping]: e.target.value })}
                                        className="bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none"
                                    >
                                        <option value="">-- Chọn cột tương ứng --</option>
                                        {headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => { setStep(1); setParsedRows([]); setHeaders([]); }}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={handleConfirmMapping}
                                className="bg-brand-purple hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Xác nhận & Nhập
                            </button>
                        </div>

                        <div className="mt-8 border-t border-slate-700 pt-4">
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Xem trước (3 dòng đầu)</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs uppercase bg-slate-800 text-gray-300">
                                        <tr>
                                            {headers.map(h => <th key={h} className="px-4 py-2 whitespace-nowrap">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedRows.slice(0, 3).map((row, i) => (
                                            <tr key={i} className="border-b border-slate-700">
                                                {headers.map(h => <td key={h} className="px-4 py-2 whitespace-nowrap">{row[h]}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
