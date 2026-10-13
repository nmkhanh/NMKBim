# Schedule & Quantities Viewport Component

## 1. Mục đích và Kiến trúc
Bảng thống kê Schedule cung cấp góc nhìn dạng bảng biểu (tabular view) cho toàn bộ các phần tử đang hiển thị trong dự án BIM. Nó liên kết trực tiếp với dữ liệu thuộc tính của từng phần tử.

## 2. Tính năng chính
- **Cấu hình cột linh hoạt (Column Configurator)**:
  - Menu checkbox cho phép bật/tắt hiển thị từng trường thuộc tính (`Category`, `Level`, `Material`, `Volume`, `Dimensions`...).
  - Chỉ hiển thị các cột người dùng quan tâm, tránh tràn bảng.
- **Tự động trích xuất thuộc tính**: Quét toàn bộ các đối tượng hiện hữu để tạo danh mục cột khả dụng.
- **Multi-select**: Click vào các dòng (kết hợp phím Shift trên Web/Desktop hoặc chế độ chọn nhiều) để chọn nhiều phần tử cùng lúc.

---

## 3. Hướng dẫn Triển khai cho Mobile (Mobile Porting Guide)
1. **Giao diện Cảm ứng**:
   - Thay vì bảng dàn ngang nhiều cột gây tràn màn hình điện thoại, triển khai dạng **Card List hoặc Expandable List**:
     - Tiêu đề Card: Tên phần tử + Mã ID.
     - Các dòng con: Thuộc tính chính đã chọn (Level, Thể tích, Vật liệu).
   - Vuốt sang trái/phải để chuyển tab cột hoặc dùng Horizontal Virtual Scroll (ví dụ `FlatList` ngang trong React Native).
2. **Cử chỉ Chọn (Multi-Selection Gesture)**:
   - Nhấn giữ (Long Press) 0.5s lên 1 dòng để kích hoạt chế độ "Chọn nhiều (Multi-select Mode)".
   - Lúc này các checkbox tròn bên trái từng dòng sẽ hiện lên để người dùng chạm chọn thêm.
   - Thanh Action Bar phía dưới sẽ hiện tổng số phần tử đã chọn kèm các nút chức năng: "Đổi màu", "Tạo nhóm", "Cô lập".
3. **Hiệu năng Cuộn (Virtualization)**:
   - Khi mô hình có từ 10.000 đến 100.000 đối tượng, bắt buộc dùng cơ chế Virtualized List (như `@tanstack/react-virtual` hoặc `RecyclerListView` trên React Native) để duy trì mượt mà 60 FPS.
