# Tài liệu Tính năng: Đo đạc 3D, Góc nhìn phẳng 2D chuẩn BIM, Cài đặt & Tối ưu hiệu năng 1M Elements

## 1. Tổng quan
Tài liệu đặc tả các nâng cấp toàn diện và đồng bộ giữa **Web** (Three.js + React) và **Desktop** (WPF + HelixToolkit .NET 9):
1. **Góc nhìn phẳng chuẩn BIM (True 2D Flat Views)**: Plan (Top/Bottom) và Section (Front/Back/Left/Right, Instant Slice vs Box Depth).
2. **Tâm xoay mượt mà (Smooth Pivot Rotation)**: Khi chọn đối tượng, tâm xoay cập nhật theo trọng tâm đối tượng mà không bị giật/nhảy camera (`cam.position` giữ nguyên).
3. **Bảo vệ thao tác kéo chuột (Drag vs Click Protection)**: Kéo chuột để xoay/pan không bao giờ kích hoạt chọn hay xóa lựa chọn đối tượng (ngưỡng di chuyển $\le 4\text{px}$ mới tính là click).
4. **ViewCube phông chữ lớn**: Tăng kích thước phông chữ lên 90, hiển thị sắc nét chữ FRONT, BACK, TOP, BOTTOM, LEFT, RIGHT.
5. **Thanh Schedule thông minh**: Tìm kiếm nhanh, nút "Select All" / "Clear", lọc cột, checkbox group & sort.
6. **Reset màu file mô hình**: Khôi phục màu gốc từ vật liệu file khi người dùng bỏ đổi màu.
7. **Hộp thoại Cài đặt (Settings Modal)**: Cho phép cấu hình màu sắc highlight khi chọn element.
8. **Bộ công cụ đo khoảng cách 3D (Measurement Tool)**: Đo khoảng cách thực giữa 2 điểm với các tùy chọn đơn vị `mm`, `cm`, `m`, `inch`, `ft`.
9. **Tối ưu RAM và Render cho 100,000 - 1,000,000 Elements**.

---

## 2. Kiến trúc & Giải pháp kỹ thuật

### 2.1. Góc nhìn phẳng chuẩn BIM (True 2D Flat Views)
- **Top Plan View**:
  - Web: Sử dụng `THREE.OrthographicCamera` với kích thước frustum tính toán theo bán kính mô hình:
    $$\text{left} = -\frac{R \cdot 1.5 \cdot \text{aspect}}{2}, \quad \text{right} = \frac{R \cdot 1.5 \cdot \text{aspect}}{2}$$
    $$\text{top} = \frac{R \cdot 1.5}{2}, \quad \text{bottom} = -\frac{R \cdot 1.5}{2}$$
  - Hướng nhìn: Top-down ($Z \to -Z$) hoặc Bottom-up ($-Z \to +Z$). Vector Up luôn là $+Y (0, 1, 0)$.
  - Desktop: `viewPort.Orthographic = true;` với `UpDirection = (0, 1, 0)`.
- **Section Cut View**:
  - Trích xuất từ Section Box hoặc mặt cắt phẳng tức thì (Instant Slice).
  - 4 hướng cắt: `Front` $(+Y)$, `Back` $(-Y)$, `Left` $(+X)$, `Right` $(-X)$. Vector Up luôn là $+Z (0, 0, 1)$.
  - Chế độ `Instant Slice` ($hasDepth = false$): Chỉ dùng 1 mặt phẳng cắt duy nhất vuông góc hướng nhìn, không có độ sâu thể tích.

### 2.2. Tâm xoay mượt mà (Smooth Pivot Rotation)
- **Vấn đề cũ**: Khi click chọn đối tượng, việc gán `target` mới rồi gọi hàm cập nhật camera làm `position` bị nhảy về góc spherical mặc định.
- **Giải pháp**:
  - Giữ nguyên tọa độ camera `cam.position` trong không gian thế giới.
  - Tính toán lại vector từ tâm mới đến camera:
    $$\vec{v} = \mathbf{P}_{\text{cam}} - \mathbf{C}_{\text{selection}}$$
    $$R = \|\vec{v}\|, \quad \phi = \arcsin\left(\frac{v_z}{R}\right), \quad \theta = \operatorname{atan2}(v_x, v_y)$$
  - Điều này cập nhật tâm quay `controls.target` ngay lập tức mà camera hoàn toàn không bị giật/nhảy.
  - Khi bỏ chọn: Tâm xoay giữ nguyên vị trí trước đó, không bị snap về gốc tọa độ $(0, 0, 0)$.

### 2.3. Chống kích hoạt Select khi kéo chuột (Drag vs Click)
- Lưu tọa độ chuột khi nhấn xuống: $\mathbf{P}_{\text{down}} = (x_{\text{down}}, y_{\text{down}})$.
- Khi nhả chuột: Tính khoảng cách Euclidean:
  $$d = \sqrt{(x_{\text{up}} - x_{\text{down}})^2 + (y_{\text{up}} - y_{\text{down}})^2}$$
- Nếu $d > 4\text{px}$, thao tác là xoay view (Orbit) hoặc Pan $\to$ bỏ qua xử lý Selection.
- Chỉ khi $d \le 4\text{px}$ mới kiểm tra Raycasting hit test.

### 2.4. Công cụ Đo đạc 3D (Measurement Tool)
- Cho phép kích hoạt đo đạc trên cả 3 góc nhìn (3D, Plan, Section).
- Điểm 1: Lưu `Point3D` thứ nhất từ Raycasting surface intersection.
- Điểm 2: Lưu `Point3D` thứ hai và tính khoảng cách không gian 3 chiều:
  $$D = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}$$
- Đổi đơn vị chuẩn:
  - $\text{mm} = D \times 1000$
  - $\text{cm} = D \times 100$
  - $\text{m} = D$
  - $\text{inch} = D \times 39.3701$
  - $\text{ft} = D \times 3.28084$

---

## 3. Hướng dẫn triển khai cho Mobile (Mobile Porting Guide)

### 3.1. Thư viện khuyến nghị
- **React Native (Expo / Bare)**:
  - Sử dụng `@react-three/fiber` hoặc `expo-gl` với Three.js bundle rút gọn.
  - Sử dụng `react-native-gesture-handler` cho thao tác Touch Pan & Pinch Zoom.
- **Flutter**:
  - Sử dụng `flutter_gl` hoặc `three_dart`.
- **.NET MAUI**:
  - Dùng `SkiaSharp` hoặc `Silk.NET` / `OpenTK` hoặc WebView nhúng engine Three.js tối ưu cao.

### 3.2. Triển khai Gestures trên Mobile
- **1-finger Drag**: Orbit xoay mô hình (nếu kéo di chuyển $> 8\text{dp}$).
- **1-finger Tap**: Select / Deselect element (nếu thời gian chạm $< 250\text{ms}$ và di chuyển $< 8\text{dp}$).
- **2-finger Pinch**: Zoom In / Zoom Out.
- **2-finger Drag**: Pan camera song song mặt phẳng nhìn.
- **Double Tap**: Zoom Extents vừa vặn màn hình (tương đương Double Middle Click trên Desktop).

### 3.3. Tối ưu bộ nhớ cho thiết bị di động (Mobile Memory Optimization)
- Đối với dữ liệu lớn $100,000$ - $1,000,000$ elements trên mobile:
  1. **InstancedMesh**: Gộp tất cả các element có cùng category/hình học vào `InstancedMesh` với ma trận $4\times 4$ và `Float32Array` instance color.
  2. **Geometry Quantization**: Dùng `Int16Array` (tọa độ chuẩn hóa $0 \dots 65535$) thay vì `Float64Array`, tiết kiệm $75\%$ RAM GPU của điện thoại.
  3. **Occlusion Culling / BVH**: Tích hợp `three-mesh-bvh` để chỉ vẽ các tam giác nằm trong frustum màn hình điện thoại.
  4. **Level of Detail (LOD)**: Khi camera ở xa, thay thế các element chi tiết cao bằng bounding box đơn giản.
