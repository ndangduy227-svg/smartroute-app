import React, { useState } from 'react';

export type GuideType = 'LARK' | 'POSCAKE' | 'GSHEET';

interface GuideStep {
    title: string;
    content: React.ReactNode;
    image?: string; // Placeholder for future images
}

const GUIDES: Record<GuideType, { title: string; steps: GuideStep[] }> = {
    GSHEET: {
        title: 'Kết nối Google Sheet',
        steps: [
            {
                title: 'Bước 1: Chuẩn bị Sheet',
                content: (
                    <div className="space-y-2">
                        <p>Tạo Google Sheet với dòng đầu tiên là tiêu đề cột.</p>
                        <div className="bg-slate-800 p-2 rounded text-xs font-mono text-gray-300">
                            TenKhach | DiaChi | SDT | COD | GhiChu
                        </div>
                        <p className="text-sm text-gray-400">Dữ liệu đơn hàng bắt đầu từ dòng thứ 2.</p>
                    </div>
                )
            },
            {
                title: 'Bước 2: Apps Script',
                content: (
                    <div className="space-y-2">
                        <p>Vào <strong>Extensions</strong> {'>'} <strong>Apps Script</strong>. Dán code sau:</p>
                        <pre className="bg-slate-900 p-2 rounded text-[10px] font-mono text-green-400 overflow-x-auto">
                            {`function doGet() {
  var data = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getDataRange().getValues();
  var headers = data[0];
  var result = data.slice(1).map(r => {
    var obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}`}
                        </pre>
                    </div>
                )
            },
            {
                title: 'Bước 3: Deploy Web App',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Nhấn nút <strong>Deploy</strong> (Xanh dương) {'>'} <strong>New deployment</strong>.</li>
                        <li>Chọn loại: <strong>Web app</strong>.</li>
                        <li>Who has access: Chọn <strong>Anyone (Bất kỳ ai)</strong>.</li>
                        <li>Nhấn <strong>Deploy</strong> và cấp quyền truy cập.</li>
                        <li>Copy URL Web App và dán vào SmartRoute.</li>
                    </ul>
                )
            }
        ]
    },
    LARK: {
        title: 'Kết nối Lark Base',
        steps: [
            {
                title: 'Bước 1: Lấy App ID & Secret',
                content: 'Truy cập Lark Developer Console, tạo App mới và lấy App ID, App Secret.'
            },
            {
                title: 'Bước 2: Cấp quyền (Permissions)',
                content: 'Trong mục "Permissions & Scopes", bật quyền đọc Base (bitable:app:read).'
            },
            {
                title: 'Bước 3: Lấy Base ID & Table ID',
                content: 'Mở Lark Base của bạn. ID nằm trên URL: /base/<Base_ID>?table=<Table_ID>.'
            }
        ]
    },
    POSCAKE: {
        title: 'Kết nối POSCake (Pancake)',
        steps: [
            {
                title: 'Bước 1: Lấy Access Token',
                content: 'Đăng nhập vào POSCake, vào phần Cài đặt API để lấy Access Token.'
            },
            {
                title: 'Bước 2: Nhập Token',
                content: 'Copy Token và dán vào ô nhập liệu bên dưới.'
            }
        ]
    }
};

interface ImportGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: GuideType;
}

export const ImportGuideModal: React.FC<ImportGuideModalProps> = ({ isOpen, onClose, type }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const guide = GUIDES[type];

    if (!isOpen) return null;

    const nextStep = () => {
        if (currentStep < guide.steps.length - 1) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{guide.title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="mb-4 flex justify-between items-center text-xs text-gray-500 uppercase font-bold">
                        <span>Bước {currentStep + 1} / {guide.steps.length}</span>
                        <div className="flex gap-1">
                            {guide.steps.map((_, idx) => (
                                <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentStep ? 'bg-brand-teal' : 'bg-slate-700'}`}></div>
                            ))}
                        </div>
                    </div>

                    <h4 className="text-lg font-bold text-brand-purple mb-4">{guide.steps[currentStep].title}</h4>
                    <div className="text-gray-300 text-sm leading-relaxed">
                        {guide.steps[currentStep].content}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 flex justify-between">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className={`px-4 py-2 rounded font-bold transition-colors ${currentStep === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-slate-800'}`}
                    >
                        Quay lại
                    </button>
                    {currentStep < guide.steps.length - 1 ? (
                        <button
                            onClick={nextStep}
                            className="px-6 py-2 bg-brand-teal text-brand-dark font-bold rounded hover:bg-teal-400 transition-colors"
                        >
                            Tiếp theo
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-brand-purple text-white font-bold rounded hover:bg-indigo-500 transition-colors"
                        >
                            Hoàn tất
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
