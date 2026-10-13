# Quy chuẩn Logic: Opacity, Measurement Snapping, ViewCube Z-Up & Graphic Modes

Tài liệu này mô tả chi tiết logic kỹ thuật để đội ngũ phát triển Mobile (hoặc các nền tảng khác) porting dễ dàng và đồng bộ 100% với Web và Desktop (WPF).

---

## 1. Hệ thống Độ Trong Suốt (Opacity) Phân Tầng

Ứng dụng hỗ trợ kiểm soát độ trong suốt ở hai cấp độ:
1. **File Opacity** ($O_{file} \in [0.0, 1.0]$): Áp dụng cho toàn bộ các element thuộc file đó. Mặc định là `1.0`.
2. **Element Opacity** ($O_{elem} \in [0.0, 1.0]$): Áp dụng cho từng element riêng lẻ hoặc nhóm element được chọn. Mặc định là `1.0`.

### Công thức tính toán độ mờ thực tế ($O_{effective}$):
$$O_{effective} = \text{clamp}(O_{mat} \times O_{file} \times O_{elem}, 0.0, 1.0)$$

- **Web (Three.js)**:
  - Khi $O_{effective} < 1.0$: đặt `material.transparent = true`, `material.opacity = effectiveOpacity`, `material.depthWrite = false` (để tránh z-fighting khi vẽ xuyên thấu).
  - Khi $O_{effective} = 1.0$: đặt `material.transparent = false`, `material.depthWrite = true`.
- **Desktop (WPF / HelixToolkit)**:
  - Áp dụng `SolidColorBrush.Opacity = effectiveOpacity` cho Diffuse Material.
  - Chế độ Wireframe: tính toán Alpha channel `Color.FromArgb((byte)(255 * effectiveOpacity), R, G, B)`.

---

## 2. Đo Kích Thước Bắt Điểm (Measurement Snapping)

Công cụ thước đo không lấy tọa độ tùy ý mà ưu tiên bắt điểm thông minh vào cấu trúc hình học của element:

### Thuật toán bắt điểm (`getElementSnapPoint`):
1. **Raycasting**: Bắn tia qua vị trí con trỏ chuột/chạm chạm màn hình, xác định `Intersection` với triangle mesh và thuộc tính `face` (chứa các vertex `a, b, c` và điểm va chạm `point`).
2. **Vertex Snapping (Bắt đỉnh)**:
   - Tính khoảng cách $d_a, d_b, d_c$ từ `point` tới 3 đỉnh tam giác `vA, vB, vC`.
   - Tính ngưỡng bắt đỉnh $T_{vertex} = \min(L_{edge}) \times 0.28$.
   - Nếu $\min(d) < T_{vertex}$, điểm chụp sẽ gán chính xác vào đỉnh gần nhất.
3. **Edge / Curve Snapping (Bắt cạnh/đoạn cong)**:
   - Nếu không rơi vào vùng đỉnh, chiếu điểm `point` vuông góc lên 3 cạnh $(AB, BC, CA)$:
     $$\vec{P_{proj}} = \vec{A} + \text{clamp}\left(\frac{(\vec{P} - \vec{A}) \cdot (\vec{B} - \vec{A})}{\|\vec{B} - \vec{A}\|^2}, 0, 1\right) (\vec{B} - \vec{A})$$
   - Tìm hình chiếu có khoảng cách ngắn nhất $d_{proj}$. Nếu $d_{proj} < T_{edge}$, điểm chụp sẽ gán vào điểm chiếu trên cạnh.
4. **Visual Indicator (Gợi ý trực quan)**:
   - Hiển thị 1 điểm phát sáng màu xanh lá phong thủy (`#10b981`) tại vị trí bắt điểm khi hover để người dùng xác nhận điểm chụp trước khi click.

---

## 3. Định Hướng ViewCube Trục Z Là Đứng (Z-Up)

Hệ tọa độ chuẩn BIM quy ước trục $Z$ là trục cao độ (Top-Bottom), mặt phẳng ngang là $XY$.
1. **ViewCube Widget**:
   - Thu nhỏ kích thước còn 80px (chữ 45px) để thanh thoát và không che khuất vùng nhìn 3D.
   - Quay widget theo trục $X$ một góc $+90^\circ$ (`+Math.PI / 2`) để mặt `TOP` hướng về $+Z$, mặt `BOTTOM` hướng về $-Z`, mặt `FRONT` hướng về $+Y$.
2. **Quay Camera khi nhấn mặt ViewCube**:
   - Bù góc quaternion:
     $$Q_{target} = Q_{cube} \times Q_{rotX(-\pi/2)}$$
   - Khi đó click vào `TOP` sẽ đưa camera nhìn vuông góc từ $+Z$ xuống gốc tọa độ.

---

## 4. Chế Độ Hiển Thị Đồ Họa (Graphic Modes)

Hai chế độ hiển thị có thể chuyển đổi tức thì từ Top Navigation Bar:
1. **Shaded (Mặc định)**:
   - Render Mesh tam giác đầy đủ bóng đổ (Phong/Standard Material), tôn trọng màu gốc hoặc màu ghi đè của đối tượng và file.
2. **Wireframe (Khung dây)**:
   - Web: Chuyển toàn bộ Mesh thành `THREE.LineSegments` từ `WireframeGeometry`, giữ nguyên màu sắc của từng element.
   - Desktop: Render `LinesVisual3D` nối từng cạnh tam giác `(p0, p1), (p1, p2), (p2, p0)` với độ dày nét 1.0 (hoặc 2.0 khi được chọn).

---

## 5. Bảng Màu Phong Thủy & Typography

- **Màu chủ đạo (Primary Accent)**: Emerald Green (`#10B981` / `#059669`).
- **Phông chữ Web**: `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.
- **Phông chữ Desktop**: `Arial`.
- **Hệ thống Font Size nghiêm ngặt (chỉ có 3 cấp)**:
  - Title: `24px`
  - Header: `20px`
  - Body: `14px`
