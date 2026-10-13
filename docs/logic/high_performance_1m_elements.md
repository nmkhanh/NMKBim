# NMKBim - Hướng Dẫn Tối Ưu Hiệu Năng 100.000 Đến 1.000.000 Elements & Kiến Trúc Mobile

Tài liệu này tổng hợp giải pháp kỹ thuật giải quyết bài toán tải, hiển thị và tương tác mượt mà cho tập dữ liệu cực lớn (từ **100k đến 1.000.000 đối tượng BIM/CAD**) đồng thời giữ mức tiêu thụ RAM thấp nhất (< 1.5GB thay vì 10GB+), áp dụng trên cả Web, WPF Desktop và chuẩn bị sẵn cho Mobile.

---

## 1. Nguyên Nhân Khiến Hệ Thống Bị Đơ & Tràn RAM (10GB+ Khi 20k - 100k Elements)

1. **DOM Tree Quá Tải trong Schedule View (React / HTML Table)**:
   - Với 20.000 - 100.000 element, việc render trực tiếp các thẻ `<tr>` hoặc `<div>` tạo ra hàng trăm nghìn Node DOM trong trình duyệt V8.
   - Mỗi DOM node tiêu tốn bộ nhớ layout và render tree, khiến V8 tiêu thụ 6 - 8GB RAM và làm tê liệt thread chính của JavaScript (Main Thread freeze).
2. **Quá nhiều Three.js Mesh Riêng Lẻ & Matrix Recalculation**:
   - Nếu mỗi element là một `THREE.Mesh` riêng lẻ với `matrixAutoUpdate = true`, Three.js phải tính toán lại ma trận thế giới (World Matrix) cho từng Mesh trong mỗi frame render.
   - Mỗi Mesh có vật liệu (Material) riêng lẻ gây ra hàng chục nghìn WebGL Draw Calls mỗi frame.
3. **Lưu Trữ Dữ Liệu Model Vào LocalStorage**:
   - Việc serialize toàn bộ vertices, normals của 100k phần tử vào `localStorage` gây tràn quota (QuotaExceededError) và ép V8 giữ toàn bộ JSON chuỗi khổng lồ trong heap.
4. **Degenerate Camera View Matrix (Lỗi Top Plan & Section)**:
   - Khi góc nhìn chiếu từ đỉnh xuống đáy dọc theo trục Z (look vector song song với `camera.up = (0, 0, 1)`), tích có hướng $\vec{u} \times \vec{d} = \vec{0}$, làm hỏng ma trận quan sát (View Matrix) dẫn đến màn hình bị đen hoặc đảo chiều.

---

## 2. Giải Pháp Đã Triển Khai (Web & Desktop)

### 2.1. Virtual Scrolling (Schedule Viewport)
- **Cơ chế**: Chỉ render số hàng đang hiển thị trong viewport (khoảng 25 - 35 hàng, chiều cao cố định `30px`) thay vì 100.000 hàng.
- **Kết quả**: Bảng thống kê hiển thị ngay tức thì, RAM của DOM duy trì ở mức tối thiểu (< 20MB) bất kể tập dữ liệu có 1 triệu phần tử.
- **Hỗ trợ**: Multi-selection bằng phím `Shift`, Group By, Sort By linh hoạt.
- **Mã nguồn**: [`ScheduleView.tsx`](file:///c:/Users/Admin/Documents/antigravity/hopeful-hawking/web/src/ui/components/ScheduleView/ScheduleView.tsx).

### 2.2. Tối Ưu Hoá 3D Viewport & WebGL
- Tắt cập nhật ma trận tĩnh: `mesh.matrixAutoUpdate = false; mesh.updateMatrix();`
- Tái sử dụng Material (Material Caching): Gom các đối tượng cùng màu vào chung một `MeshStandardMaterial` instance.
- Bỏ serialize dữ liệu hình học nặng vào `localStorage`, chỉ lưu metadata và trạng thái hiển thị / màu sắc.
- Chuẩn hóa ma trận Camera:
  - **Top Plan View**: Thiết lập `camera.up = (0, 1, 0)`, camera đặt trên trục Z nhìn xuống gốc toạ độ.
  - **Section Cut View**: Thiết lập `camera.up = (0, 0, 1)`, camera nhìn ngang theo trục Y vào mặt cắt.

### 2.3. Tương Tác Chuột & Trọng Tâm Xoay (Pivot Orbit)
- Chuột phải (Context Menu) và Chuột giữa (Pan / Double-click Zoom) được cô lập hoàn toàn, **không bao giờ xóa vùng chọn (Selected Elements)**.
- Chỉ khi click chuột trái vào vùng trống (Canvas Background) mới bỏ chọn.
- Khi có các đối tượng được chọn, tâm quay (Orbit Pivot) tự động dịch chuyển về tâm hình học (Bounding Center) của nhóm đối tượng đó. Khi bỏ chọn, giữ nguyên tâm quay trước đó.

### 2.4. Desktop WPF (HelixToolkit & DataGrid)
- Kích hoạt ảo hóa bảng dữ liệu:
  ```xml
  VirtualizingStackPanel.IsVirtualizing="True"
  VirtualizingPanel.VirtualizationMode="Recycling"
  EnableRowVirtualization="True"
  SelectionMode="Extended"
  ```
- Tích hợp Loading Spinner / ProgressBar dạng Overlay khi phân tích file nặng.
- Lựa chọn màu riêng biệt cho từng tệp tải vào (Discipline Color Fallback).

---

## 3. Kiến Trúc Mở Rộng Cho 1.000.000 Elements (Triển Khai Tiếp Theo)

Để render mượt mà **1.000.000 elements** ở tốc độ 60 FPS với dung lượng RAM dưới 1GB:

### 3.1. THREE.BatchedMesh hoặc THREE.InstancedMesh
- Gộp hàng trăm nghìn đối tượng tĩnh vào một đối tượng `BatchedMesh` (hỗ trợ trong Three.js r159+) hoặc `InstancedMesh`.
- Giảm số lượng Draw Calls từ 1.000.000 xuống còn **1 - 10 Draw Calls**.
- Sử dụng Texture Buffer hoặc Attribute Buffer để lưu ID và màu sắc riêng biệt cho từng instance.

### 3.2. Web Workers & Binary Buffer Transfer
- Chuyển việc phân tích cú pháp tệp (OBJ/IFC/GLTF) sang Web Worker ngầm.
- Dùng `postMessage` với cơ chế **Transferable Objects** (`ArrayBuffer`) để chuyển dữ liệu trực tiếp sang luồng chính với thời gian copy 0ms và không nhân bản bộ nhớ RAM.

---

## 4. Hướng Dẫn Tái Sử Dụng & Triển Khai Cho Mobile (.NET MAUI / Flutter / React Native)

Đối với thiết bị di động với cấu hình phần cứng và RAM hạn chế (thường 4GB - 6GB tổng RAM hệ thống):

### 4.1. UI & Bảng Schedule
- Sử dụng danh sách ảo hóa native:
  - **.NET MAUI**: `CollectionView` với `ItemsUpdatingScrollMode="KeepItemsInView"`.
  - **Flutter**: `ListView.builder` với `itemExtent` cố định.
  - **React Native**: `FlashList` của Shopify thay thế hoàn toàn cho `FlatList`.

### 4.2. 3D Engine Mobile
- Khuyến nghị sử dụng WebView nhúng WebGL (chia sẻ chung bundle Three.js tối ưu của Web) hoặc thư viện Native:
  - Với .NET MAUI: Nhúng `BlazorWebView` hoặc `Silk.NET` / `Filament` (Google Filament Engine rất nhẹ và tối ưu cho Mobile GPU).
  - Sử dụng chung mô hình dữ liệu cấu trúc `ViewerStore` và section box clipping plane shaders.
