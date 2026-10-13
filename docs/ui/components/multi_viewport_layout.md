# Multi-Viewport Layout System (1, 2, 3, 4 Views)

## 1. Mục đích và Tổng quan
Hệ thống hiển thị đa góc nhìn (Multi-Viewport) cho phép kỹ sư BIM quan sát đồng thời không gian 3D, mặt bằng kỹ thuật (Top Plan - Z Up), mặt cắt công trình (Section View), và bảng thống kê khối lượng (Schedule & Quantities).

## 2. Các Chế độ hiển thị
- **1 View (Đơn)**: Toàn màn hình hiển thị góc nhìn 3D với đầy đủ thanh công cụ xoay (ViewCube) và Section Box nổi.
- **2 Views (Split)**: Chia đôi màn hình 50/50: Bên trái là View 3D, bên phải là Bảng thống kê (Schedule View).
- **3 Views**: Chia 3 màn hình: 1 View 3D chính, 1 Mặt bằng kỹ thuật Z-Top, và 1 Bảng thống kê.
- **4 Views (Quad)**: Lưới 2x2:
  - Góc trên-trái: View 3D Perspective.
  - Góc trên-phải: Top Plan (Mặt bằng Z-Top).
  - Góc dưới-trái: Section View (Mặt cắt).
  - Góc dưới-phải: Schedule View (Bảng thống kê khối lượng).

## 3. Cơ chế Đồng bộ Tương tác 2 Chiều (Two-Way Sync)
- Tất cả các viewport 3D và Schedule dùng chung State `selectedObjectIds`.
- Khi chọn dòng trong Schedule -> Cả 3 viewports còn lại tự động highlight nhóm element tương ứng bằng màu đỏ viền phát sáng (`emissive: #e11d48`).
- Khi quét marquee box hoặc click trong View 3D -> Hàng tương ứng trong Schedule tự động được highlight và cuộn tới vị trí hiển thị.

---

## 4. Hướng dẫn Triển khai cho Mobile (Mobile Porting Guide)
Trên thiết bị di động (màn hình nhỏ từ 5.5 inch đến 6.7 inch), việc hiển thị 4 viewport cùng lúc dạng lưới 2x2 sẽ gây chật chội và khó thao tác cảm ứng. Do đó:
1. **Thiết kế Adaptive cho Điện thoại**:
   - Sử dụng mô hình **Single Active Viewport + Bottom Sheet / Drawer**:
     - Viewport 3D luôn chiếm 100% diện tích màn hình.
     - Schedule View hiển thị dưới dạng Bottom Sheet có thể kéo lên bằng cử chỉ vuốt (Gesture Drag Up).
   - Trên thanh công cụ đỉnh (App Bar), cung cấp nút chuyển nhanh: `[3D] [Mặt bằng] [Mặt cắt] [Bảng khối lượng]`.
2. **Thiết kế cho Máy tính bảng (iPad / Android Tablet)**:
   - Sử dụng chế độ 2 Views Split: 70% bên trái là 3D/Plan View, 30% bên phải là Schedule Table.
   - Hỗ trợ chế độ Quad View khi xoay ngang màn hình (Landscape).
3. **Quản lý Tài nguyên GPU trên Mobile**:
   - Chỉ duy trì 1 WebGL Context duy nhất trên Canvas, sử dụng kỹ thuật `scissor` và `viewport` của Three.js (hoặc Filament / Google Sceneform) để render nhiều camera trên cùng 1 surface nhằm tiết kiệm RAM GPU của điện thoại.
