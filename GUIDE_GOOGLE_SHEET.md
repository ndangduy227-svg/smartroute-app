# Hướng Dẫn Kết Nối Google Sheet với SmartRoute

Để nhập đơn hàng trực tiếp từ Google Sheet, bạn cần tạo một **Google Apps Script** để chuyển dữ liệu Sheet thành định dạng JSON mà hệ thống có thể đọc được.

## Bước 1: Chuẩn bị Google Sheet
1. Tạo một Google Sheet mới hoặc mở Sheet có sẵn.
2. Dòng đầu tiên (Hàng 1) **bắt buộc** phải là tiêu đề cột (Ví dụ: `TenKhach`, `DiaChi`, `SDT`, `COD`, `GhiChu`).
3. Nhập dữ liệu đơn hàng từ hàng thứ 2 trở đi.

## Bước 2: Tạo Apps Script
1. Trên thanh menu của Google Sheet, chọn **Extensions (Tiện ích mở rộng)** > **Apps Script**.
2. Xóa hết code cũ trong file `Code.gs` và dán đoạn code sau vào:

```javascript
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  // Lấy hàng tiêu đề
  var headers = data[0];
  
  // Lấy các hàng dữ liệu
  var rows = data.slice(1);
  
  // Chuyển đổi thành mảng các object JSON
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      // Xử lý dữ liệu để tránh lỗi null/undefined
      var value = row[index];
      if (value instanceof Date) {
        value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }
      obj[header] = value;
    });
    return obj;
  });
  
  // Trả về kết quả JSON
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Nhấn `Ctrl + S` để lưu lại (Đặt tên project là "SmartRoute API" hoặc tùy ý).

## Bước 3: Triển khai (Deploy) Web App
1. Nhấn nút **Deploy (Triển khai)** màu xanh ở góc trên bên phải > chọn **New deployment (Tùy chọn triển khai mới)**.
2. Nhấn vào biểu tượng bánh răng (Select type) > chọn **Web app**.
3. Điền thông tin:
   - **Description**: SmartRoute API
   - **Execute as (Thực thi dưới quyền)**: `Me (Tôi)` (Email của bạn).
   - **Who has access (Ai có quyền truy cập)**: Chọn **`Anyone (Bất kỳ ai)`**. *Lưu ý: Đây là bước quan trọng nhất để SmartRoute có thể đọc dữ liệu.*
4. Nhấn **Deploy**.
5. Cấp quyền truy cập (Authorize access) nếu được hỏi -> Chọn tài khoản Google -> Advanced -> Go to ... (unsafe) -> Allow.

## Bước 4: Lấy URL và Sử dụng
1. Sau khi deploy thành công, bạn sẽ nhận được một **Web App URL** (có dạng `https://script.google.com/macros/s/.../exec`).
2. Copy URL này.
3. Quay lại **SmartRoute** > **Import Đơn Hàng**.
4. Dán URL vào ô "Google Sheet URL" và nhấn **Import Sheet**.

---
**Lưu ý:** Mỗi khi bạn thêm đơn hàng mới vào Sheet, dữ liệu sẽ tự động cập nhật qua API này (không cần deploy lại, trừ khi bạn sửa code).
