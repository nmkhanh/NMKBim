# QUẢN LÝ TẬP TIN MÔ HÌNH (FILE SELECTION & VISIBILITY LISTBOX)

## 1. MỤC TIÊU
Cho phép người dùng:
1. Mở và nạp nhiều file mô hình 3D JSON cùng lúc thông qua nút **Select File...**.
2. Danh sách ListBox hiển thị tất cả các file đang được nạp.
3. Mỗi file đi kèm một **Checkbox** để người dùng bật/tắt (ẩn/hiện) riêng lẻ từng file mô hình trên không gian 3D.

---

## 2. TRIỂN KHAI TRÊN WEB (REACT + TYPESCRIPT)
- **Component**: [`FileListBox.tsx`](file:///h:/My%20Drive/NMKBim/web/src/ui/components/FileListBox/FileListBox.tsx)
- **State**: `files: LoadedFileEntry[]`, `toggleFileVisibility(id: string)`.
- **Cơ chế render**:
  - `Viewport3D` lắng nghe mảng `files`.
  - Chỉ những file có thuộc tính `visible: true` mới được chuyển đổi thành `THREE.Mesh` và đưa vào `scene`.
  - Giúp giải phóng bộ nhớ GPU và tăng tốc khung hình khi tắt các mô hình không cần quan sát.

---

## 3. TRIỂN KHAI TRÊN DESKTOP (WPF MVVM)
- **Model**: `LoadedFileItem` (kế thừa `ObservableObject` với thuộc tính `IsVisible`).
- **ListBox**: Sử dụng `ItemTemplate` với `CheckBox IsChecked="{Binding IsVisible, Mode=TwoWay}"`.
- **Logic**: Khi thuộc tính `IsVisible` thay đổi, `RefreshVisibleObjects()` tự động đồng bộ lại danh sách hiển thị và bảng thuộc tính tương ứng.
