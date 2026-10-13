# Cơ chế Lưu trữ Trạng thái (Persistence) & Giới hạn Section Box Động

## 1. Lưu trữ Trạng thái Khi F5 / Khởi động lại (Session Persistence)
Để người dùng không bị mất file hay công việc đã làm khi tải lại trang (F5) hoặc mở lại ứng dụng Desktop:
- **Web**: Sử dụng `localStorage` (khóa `nmkbim_viewer_state_v1`):
  - Danh sách các file JSON đã nạp (`files`: Document, ID, Visibility).
  - Bản đồ đổi màu (`colorOverrides`: map ID sang Hex).
  - Danh sách các nhóm (`groups`: ID, Tên, ID danh sách phần tử, Màu sắc).
  - Chế độ màn hình (`layoutMode`: 1, 2, 3, 4).
  - Cấu hình cột hiển thị trong Schedule (`scheduleColumns`).
  - Giao diện và Ngôn ngữ (`theme`, `language`).
- **Desktop WPF**:
  - Lưu vào thư mục dữ liệu cục bộ: `%LOCALAPPDATA%/NMKBim/session_state.json`.
  - Khi khởi động: Tự động nạp lại danh sách file từ đường dẫn đã lưu.

---

## 2. Tính toán Giới hạn Section Box Động (Dynamic Bounds)
Thay vì cố định khoảng cắt từ $-6$ đến $+6$ quanh gốc tọa độ $(0, 0, 0)$:
1. Mỗi khi nạp file, xóa file, hoặc bật/tắt checkbox ẩn hiện:
   - Quét qua toàn bộ mảng đỉnh `vertices` của các đối tượng đang hiển thị.
   - Tìm giá trị cực trị:
     $$X_{\min} = \min(x_i), \quad X_{\max} = \max(x_i)$$
     $$Y_{\min} = \min(y_i), \quad Y_{\max} = \max(y_i)$$
     $$Z_{\min} = \min(z_i), \quad Z_{\max} = \max(z_i)$$
2. Thêm khoảng đệm 5% (Padding):
   $$\text{pad}_X = \max((X_{\max} - X_{\min}) \times 0.05, 0.5)$$
   $$X_{\min} \leftarrow X_{\min} - \text{pad}_X, \quad X_{\max} \leftarrow X_{\max} + \text{pad}_X$$
3. Gán dải giá trị này làm `Minimum` và `Maximum` của các thanh trượt Section Box.

---

## 3. Hướng dẫn Triển khai cho Mobile (Mobile Porting Guide)
1. **Lưu trữ Cục bộ trên Mobile**:
   - Sử dụng `AsyncStorage` (React Native) hoặc `SharedPreferences` (Android) / `NSUserDefaults` (iOS).
   - Với các file mô hình dung lượng lớn (> 10MB), không lưu JSON trực tiếp vào Key-Value Storage mà lưu vào thư mục `DocumentsDirectory` của App Sandbox, trong Key-Value chỉ lưu danh sách đường dẫn file (File Paths).
2. **Bộ nhớ RAM khi Tải lại (App Resume)**:
   - Khi ứng dụng chuyển sang chế độ nền (Background) hoặc bị hệ điều hành đóng để giải phóng RAM, trạng thái phiên làm việc vẫn được bảo toàn nguyên vẹn nhờ việc ghi snapshot trạng thái trước khi đóng app.
