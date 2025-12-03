
import React, { useState, useCallback } from 'react';
import { RawOrder, Order, OrderStatus, FieldMapping } from '../types';
import { MOCK_ORDERS_CSV } from '../constants';
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

    const processFile = async (file: File) => {
        setErrorMsg('');
        setFileName(file.name);

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

        const headerLine = lines[0].split(',');
        const headerRow = headerLine.map(h => h.trim());
        setHeaders(headerRow);

        const dataRows = lines.slice(1).map((line, idx) => {
            const values = line.split(',');
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

            {step === 2 && (
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
            )}
        </div>
    );
};
