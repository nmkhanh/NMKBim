# BẢNG THUỘC TÍNH 2 CỘT (PROPERTY GRID INSPECTOR)

## 1. MỤC ĐÍCH & KIẾN TRÚC
Bảng Property Grid là thành phần trọng tâm dùng để kiểm tra chi tiết các tham số BIM/CAD của đối tượng được chọn trong không gian 3D.
- **Cấu trúc**: Bảng 2 cột cố định:
  - Cột 1: `Property Name` (Tên thuộc tính, VD: `Category`, `Height`, `Volume`, `Material`, `Fire Rating`).
  - Cột 2: `Value` (Giá trị, VD: `500x500 mm`, `3.0 m`, `Concrete C30/37`).

---

## 2. TRIỂN KHAI TRÊN WEB (REACT / THREE.JS)
- **Component**: [`PropertyGrid.tsx`](file:///h:/My%20Drive/NMKBim/web/src/ui/components/PropertyGrid/PropertyGrid.tsx)
- **Vị trí**: Nằm cố định ở cột bên phải (`rightSidebar`, độ rộng 320px).
- **Luồng dữ liệu**:
  1. Khi người dùng click chuột vào khối 3D trên Canvas, Three.js `Raycaster` bắt ID của mesh.
  2. Hàm `selectObject(id)` trong `viewerStore` được gọi.
  3. `getSelectedObject()` tự động tìm kiếm đối tượng trong các file đang bật hiển thị (`visible: true`).
  4. Bảng `PropertyGrid` tự động render bảng 2 cột kèm ID và Name của khối. Nếu chưa có đối tượng nào được click, hệ thống tự động chọn đối tượng đầu tiên hoặc hiển thị hướng dẫn trực quan.

---

## 3. TRIỂN KHAI TRÊN DESKTOP (WPF / MVVM)
- **Control**: [`DataGrid`](file:///h:/My%20Drive/NMKBim/desktop/src/App/Views/MainWindow.xaml) với style [`DataGridStyle.xaml`](file:///h:/My%20Drive/NMKBim/desktop/src/App/Styles/DataGridStyle.xaml).
- **Tối ưu hiệu năng**:
  - `EnableRowVirtualization="True"`
  - `VirtualizingPanel.VirtualizationMode="Recycling"`
  - `IsReadOnly="True"`
  - Đảm bảo cuộn mượt mà 60 FPS kể cả khi khối hình có hàng trăm thông số BIM.

---

## 4. HƯỚNG DẪN TRIỂN KHAI CHO MOBILE (SAU NÀY)
- Dùng `<FlatList>` (React Native) hoặc `CollectionView` (.NET MAUI).
- Sử dụng trực tiếp danh sách `KeyValuePair<string, string>` từ data contract.
