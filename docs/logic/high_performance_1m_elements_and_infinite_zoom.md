# Kiến Trúc Hiệu Năng Cực Hạn (1.000.000 Elements) & Đồng Bộ Chi Tiết Kỹ Thuật

Tài liệu này cung cấp toàn bộ giải pháp kỹ thuật, cơ chế xử lý không giới hạn độ sâu (infinite zoom), bắt điểm (snapping), trích xuất mặt cắt (sectioning) và tối ưu hóa bộ nhớ cho 1.000.000 elements trên cả 3 nền tảng Web, Desktop WPF và Mobile.

---

## 1. Giải Pháp Hiệu Năng 1.000.000 Elements (Zero-Lag & Low RAM)

Khi số lượng đối tượng đạt từ 4.000 đến 1.000.000 elements:
1. **Bottleneck của Render Pipeline truyền thống**:
   - Việc lặp qua hàng nghìn đối tượng và tái tạo mới `MeshGeometry3D` / `THREE.BufferGeometry` hoặc `MaterialGroup` mỗi khi click chọn sẽ làm CPU và GPU nghẽn hoàn toàn.
2. **Cơ chế Triển khai Đột phá**:
   - **Geometry Caching**: Cache toàn bộ hình học tam giác đã tạo theo `obj.Id`. Đối tượng không bao giờ bị deserialize hoặc recalculate lại lần thứ hai.
   - **Material Flyweight Caching**: Toàn bộ đối tượng có cùng màu sắc/độ mờ/highlight chia sẻ cùng 1 con trỏ Material duy nhất.
   - **Wireframe Cache**: Cache các `LinesVisual3D` / `LineSegments` khung dây theo ID và màu sắc.
   - **Virtual Scrolling**: Schedule DataGrid chỉ render ~30 dòng trong DOM viewport, giữ RAM UI luôn dưới 30MB bất kể tập dữ liệu có 1 triệu hàng.
   - **Selective Property Inspector**: Không quét toàn bộ thuộc tính của 1 triệu phần tử nếu không được yêu cầu; gom nhóm "varies" chỉ trên các phần tử thực sự được chọn.

---

## 2. Zoom Không Giới Hạn Chiều Sâu (Infinite Depth Zoom)

- **Vấn đề cũ**: Dùng công thức tuyến tính `radius += deltaY * (radius * 0.001)`. Càng tiến gần mục tiêu (`radius -> 0`), bước nhảy càng thu nhỏ lại khiến camera bị "kẹt", không thể xuyên sâu qua vật thể.
- **Giải pháp Exponential Zoom**:
  $$R_{new} = R_{old} \times 0.95^{\frac{\Delta Y}{50}}$$
  - Tỉ lệ phần trăm giữ nguyên ở mọi mức khoảng cách.
  - Ngưỡng tối thiểu được mở rộng đến $0.0001$ mét (0.1mm), cho phép zoom xuyên thấu chi tiết cấu kiện nhỏ nhất mà không bị khựng hay chậm lại.

---

## 3. Thuật Toán Bắt Điểm (Vertex & Edge Snapping)

Cho cả Web (Three.js) và Desktop (WPF HelixToolkit):
1. Khi con trỏ chuột hover/click gần đối tượng, tính khoảng cách từ điểm va chạm tia chiếu ($P_{raw}$) đến các đỉnh của tam giác va chạm:
   $$d_{min} = \min(\|P_{raw} - V_a\|, \|P_{raw} - V_b\|, \|P_{raw} - V_c\|)$$
2. Ngưỡng bắt đỉnh được nới rộng phù hợp: $T_{vertex} = \max(L_{edge} \times 0.45, 0.12\text{m})$.
3. Nếu ngoài vùng đỉnh, chiếu $P_{raw}$ vuông góc lên 3 cạnh:
   $$P_{proj} = V_1 + \text{clamp}\left(\frac{(P_{raw} - V_1) \cdot (V_2 - V_1)}{\|V_2 - V_1\|^2}, 0, 1\right)(V_2 - V_1)$$
4. Đảm bảo 100% bắt dính vào góc cạnh cấu kiện BIM khi thực hiện thao tác đo.

---

## 4. Trích Xuất Section View Trực Tiếp Từ Plan & Cạnh Element

- Cho phép người dùng click chuột phải vào bất kỳ cạnh hoặc phần tử nào trên mô hình hoặc trên Plan View:
  - Chọn `✂️ Create Section from Element Edge`.
  - Tự động trích xuất Bounding Box của đối tượng, căn chỉnh Section Box bao quanh cấu kiện và chuyển ngay sang chế độ Section View phẳng theo đúng hướng quan sát.
