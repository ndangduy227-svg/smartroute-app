import React from 'react';

interface UserGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="text-brand-teal">SmartRoute</span> Hướng Dẫn Sử Dụng
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 space-y-12">
                    {/* Section 1: Import */}
                    <section>
                        <h3 className="text-xl font-bold text-brand-purple mb-4 flex items-center gap-2">
                            1. Nhập Đơn Hàng (Import)
                        </h3>
                        <div className="space-y-4 text-gray-300">
                            <p>Bạn có 3 cách để nhập đơn hàng vào hệ thống:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong className="text-white">File Excel/CSV:</strong> Kéo thả file `.xlsx` hoặc `.csv` vào khung upload.
                                </li>
                                <li>
                                    <strong className="text-white">Google Sheet (App Script):</strong> Nhập URL Web App của Google Apps Script để lấy dữ liệu JSON trực tiếp từ Sheet.
                                </li>
                                <li>
                                    <strong className="text-white">Lark Base / POSCake:</strong> Kết nối qua API (yêu cầu Token/Key).
                                </li>
                            </ul>
                            <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-brand-teal">
                                <p className="text-sm"><strong>Lưu ý:</strong> Sau khi nhập dữ liệu, bạn cần thực hiện bước <strong>Ánh xạ cột</strong> để hệ thống hiểu đâu là Tên khách, Địa chỉ, SĐT, COD, v.v.</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Planning */}
                    <section>
                        <h3 className="text-xl font-bold text-brand-purple mb-4 flex items-center gap-2">
                            2. Lập Kế Hoạch & Tối Ưu (Planning)
                        </h3>
                        <div className="space-y-4 text-gray-300">
                            <p>Tại đây bạn quản lý danh sách đơn hàng chờ giao:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Chọn đơn hàng:</strong> Sử dụng checkbox để chọn các đơn hàng muốn gộp chuyến. Có thể chọn tất cả hoặc lọc theo từ khóa.</li>
                                <li><strong>Cấu hình:</strong> Nhập số lượng đơn tối đa/shipper, số km tối đa, v.v.</li>
                                <li><strong>API Key:</strong> Nhập API Key của Track Asia để sử dụng tính năng bản đồ và tối ưu lộ trình.</li>
                            </ul>
                            <p>Nhấn nút <strong className="text-brand-teal">Tự Động Phân Tuyến (AI)</strong> để hệ thống tự động chia đơn cho các tài xế.</p>
                        </div>
                    </section>

                    {/* Section 3: Results */}
                    <section>
                        <h3 className="text-xl font-bold text-brand-purple mb-4 flex items-center gap-2">
                            3. Kết Quả & Điều Phối (Results)
                        </h3>
                        <div className="space-y-4 text-gray-300">
                            <p>Xem và chỉnh sửa các chuyến xe đã được tạo:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Bản đồ:</strong> Xem trực quan lộ trình của từng shipper.</li>
                                <li><strong>Sắp xếp thủ công:</strong> Kéo thả đơn hàng giữa các chuyến xe để điều chỉnh.</li>
                                <li><strong>Tài chính:</strong>
                                    <ul className="list-circle pl-6 mt-1 text-sm text-gray-400">
                                        <li>Nhập <strong>Phụ phí</strong> (cầu đường, bến bãi).</li>
                                        <li>Nhập <strong>Phí điểm dừng</strong> (đơn giá/điểm), hệ thống tự nhân với số lượng đơn.</li>
                                        <li>Nhập <strong>Trừ phí</strong> (nếu có).</li>
                                    </ul>
                                </li>
                            </ul>
                            <p>Sau khi chốt số liệu, nhấn nút <strong className="text-green-400">Chốt & Chuyển Đối Soát</strong>.</p>
                        </div>
                    </section>

                    {/* Section 4: Reconciliation */}
                    <section>
                        <h3 className="text-xl font-bold text-brand-purple mb-4 flex items-center gap-2">
                            4. Đối Soát & Hoàn Tất (Reconciliation)
                        </h3>
                        <div className="space-y-4 text-gray-300">
                            <p>Bước cuối cùng để xác nhận tiền thu từ Shipper:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Cập nhật trạng thái:</strong> Đánh dấu đơn hàng là Hoàn thành, Thất bại hoặc Thay đổi.</li>
                                <li><strong>Sửa đổi:</strong> Có thể sửa lại tiền COD hoặc Ghi chú cho từng đơn nếu có sai sót thực tế.</li>
                                <li><strong>Tổng kết tài chính:</strong> Xem bảng tính chi tiết:
                                    <div className="mt-2 bg-slate-800 p-2 rounded text-mono text-sm">
                                        Thu từ Shipper = Tổng COD - (Phí Ship + Phụ Phí + Phí Điểm Dừng) + Trừ Phí
                                    </div>
                                </li>
                            </ul>
                            <p>Nhấn <strong className="text-brand-teal">Hoàn tất đối soát</strong> để lưu vào Lịch sử.</p>
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t border-slate-700 bg-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-brand-purple hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Đã Hiểu
                    </button>
                </div>
            </div>
        </div>
    );
};
