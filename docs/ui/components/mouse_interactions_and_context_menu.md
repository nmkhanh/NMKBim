# TƯƠNG TÁC CHUỘT VÀ ĐIỀU KHIỂN HIỂN THỊ (DESKTOP INTERACTION)

## 1. NGUYÊN TẮC QUẢN LÝ ẨN/HIỆN MÔ HÌNH
1. **File Checkbox trong ListBox**:
   - Khi bỏ chọn Checkbox của một file, toàn bộ khối hình 3D của file đó bị **ẩn hoàn toàn (loại bỏ khỏi không gian vẽ)** chứ không chỉ dừng lại ở việc không cho chọn.
   - Bảng thuộc tính và danh sách đối tượng lập tức tự động đồng bộ lại.

---

## 2. THAO TÁC CHUỘT NÂNG CAO (ADVANCED MOUSE CONTROLS)

### 2.1. Nhấp đúp chuột giữa (Middle Mouse Double-Click - Zoom to Fit):
- Khi bạn **nhấp đúp chuột giữa 2 lần liên tiếp** trên vùng 3D Viewport:
  - Hệ thống tự động tính toán lại hộp bao (Bounding Box) của **toàn bộ các đối tượng đang còn hiển thị** trên màn hình.
  - Camera sẽ tự động zoom mượt mà (`viewPort.ZoomExtents(500)`) để đưa toàn bộ các đối tượng còn lại lấp đầy vừa vặn khung nhìn.

### 2.2. Context Menu Chuột Phải (Right-Click Context Menu):
Khi click chuột phải vào một đối tượng hoặc trên không gian 3D, menu ngữ cảnh hiện ra với các lệnh:
1. **Isolate Element**:
   - Chỉ giữ lại duy nhất đối tượng được chọn trên màn hình, tất cả các khối khác tạm thời bị ẩn.
   - Camera tự động zoom vừa khít vào đối tượng này.
2. **Hide Element**:
   - Ẩn đối tượng được chọn khỏi không gian 3D.
3. **Reset Visibility**:
   - Phục hồi lại toàn bộ các đối tượng đã bị Isolate hoặc Hide trước đó.
   - Tự động zoom lại toàn cảnh mô hình.
