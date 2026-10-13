# TRIỂN KHAI ENGINE 3D THẬT SỰ CHO DESKTOP (HELIX TOOLKIT)

## 1. LỰA CHỌN PACKAGE & CÔNG NGHỆ CHÍNH THỨC
Để render mô hình 3D thật sự trên WPF với tiêu chí **siêu nhẹ, không tốn tài nguyên phụ thuộc, chuẩn MVVM**, giải pháp tối ưu được lựa chọn là:
- **Package**: `HelixToolkit.Wpf` (phiên bản 3.1.2) - Chuẩn công nghiệp số 1 cho WPF 3D CAD/BIM.
- **Lợi ích**:
  - Tích hợp sẵn điều khiển camera chuột (xoay chuột phải, pan chuột giữa, zoom con lăn).
  - Tích hợp sẵn khối điều hướng **ViewCube chuyên nghiệp** ở góc trên với các mặt `TOP, BOTTOM, FRONT, BACK, LEFT, RIGHT` có thể click trực tiếp để xoay góc nhìn.
  - Hiển thị FPS và số lượng tam giác (`TriangleCountInfo`).

---

## 2. KIẾN TRÚC MESH BUILDER
- **Service**: [`HelixMeshBuilder.cs`](file:///h:/My%20Drive/NMKBim/desktop/src/App/Services/HelixMeshBuilder.cs)
- **Quy trình nạp dữ liệu**:
  1. Đọc mảng phẳng đỉnh `Vertices: float[]` chuyển thành `Point3DCollection`.
  2. Đọc mảng chỉ số tam giác `Indices: int[]` chuyển thành `Int32Collection`.
  3. Đọc mảng pháp tuyến `Normals: float[]` chuyển thành `Vector3DCollection`.
  4. Tạo vật liệu `MaterialGroup` từ màu sắc và độ trong suốt của `MaterialDefinition`.
  5. Gọi hàm `mesh.Freeze()` để khoá dữ liệu bất biến, cho phép GPU truy cập trực tiếp và giải phóng áp lực Garbage Collector (GC) của .NET.

---

## 3. LIÊN KẾT MVVM (DATA BINDING)
- `MainViewModel` sở hữu thuộc tính `RealScene3DGroup: Model3DGroup`.
- Khi người dùng tick/bỏ tick CheckBox các file trong ListBox, phương thức `RefreshVisibleObjects()` sẽ tạo lại `GeometryModel3D` thật và cập nhật `RealScene3DGroup` ngay lập tức.
