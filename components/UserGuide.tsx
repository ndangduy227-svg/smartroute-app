import React, { useState } from 'react';

interface UserGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const guides = [
        {
            title: "1. Nhập Đơn Hàng (Import)",
            content: "Tải file Excel mẫu về, điền thông tin đơn hàng (Tên, SĐT, Địa chỉ, COD) và upload lên hệ thống. Hệ thống sẽ tự động nhận diện các cột dữ liệu.",
            icon: (
                <svg className="w-16 h-16 text-brand-teal mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            title: "2. Lập Kế Hoạch (Planning)",
            content: "Chọn kho hàng (điểm bắt đầu), cấu hình số lượng đơn tối đa cho mỗi shipper. Bấm 'Tìm kiếm' để xem vị trí trên bản đồ, sau đó bấm 'Tạo tuyến đường tối ưu'.",
            icon: (
                <svg className="w-16 h-16 text-brand-purple mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 7m0 13V7" />
                </svg>
            )
        },
        {
            title: "3. Kết Quả & In Ấn (Results)",
            content: "Xem danh sách các chuyến xe đã được tối ưu. Bạn có thể xem chi tiết từng chuyến, gán tài xế và in Phiếu Giao Hàng (Manifest) khổ A4.",
            icon: (
                <svg className="w-16 h-16 text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        }
    ];

    const nextStep = () => setStep((prev) => (prev + 1) % guides.length);
    const prevStep = () => setStep((prev) => (prev - 1 + guides.length) % guides.length);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Content */}
                <div className="p-10 flex flex-col items-center text-center h-[400px] justify-center">
                    <div className="transform transition-all duration-500 ease-in-out">
                        {guides[step].icon}
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">{guides[step].title}</h2>
                    <p className="text-gray-300 text-lg leading-relaxed max-w-lg">
                        {guides[step].content}
                    </p>
                </div>

                {/* Navigation */}
                <div className="bg-slate-800 p-6 flex justify-between items-center border-t border-slate-700">
                    <button
                        onClick={prevStep}
                        className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Trước
                    </button>

                    <div className="flex gap-2">
                        {guides.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2.5 h-2.5 rounded-full transition-all ${i === step ? 'bg-brand-teal scale-125' : 'bg-slate-600'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={nextStep}
                        className="px-4 py-2 text-brand-teal hover:text-teal-400 font-bold flex items-center gap-2"
                    >
                        {step === guides.length - 1 ? 'Quay lại đầu' : 'Tiếp theo'}
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
