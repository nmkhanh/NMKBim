# Thuật toán Multi-Selection & Gộp Thuộc tính ("varies")

## 1. Cơ chế Multi-Selection
### A. Raycasting với phím bổ trợ (Shift + Click)
- Khi người dùng giữ phím `Shift` và click chuột trái:
  - Nếu phần tử đã nằm trong danh sách chọn: Bỏ chọn (Toggle off).
  - Nếu phần tử chưa nằm trong danh sách: Thêm vào danh sách chọn (Append).
- Khi click không giữ `Shift`:
  - Xóa toàn bộ danh sách cũ, chỉ chọn duy nhất phần tử vừa click.

### B. Quét vùng chọn bằng chuột (Marquee Box Selection)
- Khi giữ `Shift` và kéo chuột trái:
  - Vẽ một hình chữ nhật overlay bán trong suốt trên màn hình từ $(x_{\text{start}}, y_{\text{start}})$ đến $(x_{\text{current}}, y_{\text{current}})$.
- Khi thả chuột:
  - Chiếu tọa độ thế giới (World Coordinate) của tâm Bounding Box mỗi Mesh lên màn hình:
    $$\vec{p}_{\text{screen}} = \text{Project}(\vec{p}_{\text{world}}, \text{Camera}, \text{Viewport})$$
  - Nếu $\vec{p}_{\text{screen}}$ nằm trong miền chữ nhật và có $z \in [0, 1]$ (nằm phía trước camera), thêm ID đối tượng vào `selectedObjectIds`.

---

## 2. Thuật toán Gộp Thuộc tính (Property Consolidation & "varies")
Khi có $N$ đối tượng được chọn ($N \ge 2$):
1. **Tập hợp Union các Khóa (Keys)**:
   $$K = \bigcup_{i=1}^N \text{Keys}(\text{Object}_i.\text{properties})$$
2. **Xác định Giá trị Hiển thị**:
   Với mỗi khóa $k \in K$:
   - Lấy giá trị $v_1 = \text{Object}_1.\text{properties}[k]$.
   - So sánh với các đối tượng còn lại:
     - Nếu $\forall i \in [2, N]: \text{Object}_i.\text{properties}[k] == v_1$ $\rightarrow$ Hiển thị giá trị $v_1$.
     - Ngược lại $\rightarrow$ Hiển thị nhãn đặc biệt **`varies`** (màu cam, in nghiêng).

---

## 3. Quản lý Color Override và Tạo Group
- **Color Override**:
  - Lưu vào Map: `colorOverrides[objectId] = hexColor`.
  - Khi render: Nếu `colorOverrides[id]` tồn tại thì ghi đè màu `DiffuseMaterial` của vật thể bằng màu này.
- **Element Groups**:
  - Nhóm bao gồm: `{ id, name, objectIds, color }`.
  - Khi click vào một nhóm: Lập tức chọn đồng loạt toàn bộ `objectIds` trong nhóm đó.

---

## 4. Hướng dẫn Triển khai cho Mobile (Mobile Porting Guide)
1. **Lasso Selection / 2-Finger Box**:
   - Trên màn hình cảm ứng, người dùng không có phím Shift. Thay vào đó, thiết kế một nút chuyển đổi trên màn hình:
     - Chế độ **Navigate (Orbit/Pan/Pinch Zoom)**: Cử chỉ 1 ngón xoay, 2 ngón zoom.
     - Chế độ **Select (Marquee/Lasso)**: Kéo 1 ngón sẽ vẽ hộp chọn đối tượng.
2. **Hiển thị Property Grid trên Mobile**:
   - Tận dụng Bottom Sheet dạng modal có thể kéo trượt. Khi chọn 1 hoặc nhiều đối tượng, Sheet tự động mở lên với tiêu đề "N phần tử đã chọn".
   - Thuộc tính có giá trị `"varies"` hiển thị kèm badge nổi bật.
   - Thêm nút Color Picker trực tiếp trong Action Bar của Bottom Sheet.
