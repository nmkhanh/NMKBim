# QUY CHUẨN TYPOGRAPHY VÀ CHẾ ĐỘ ĐỒ HỌA WIREFRAME (WEB, DESKTOP & MOBILE)

Tài liệu này đặc tả quy chuẩn hệ thống Typography (phông chữ và cỡ chữ) cùng chế độ hiển thị khung dây đồ họa (Wireframe Graphic Mode) áp dụng đồng bộ trên **Web (React Three.js)**, **Desktop (WPF .NET 9)** và định hướng cho **Mobile**.

---

## 1. QUY CHUẨN TYPOGRAPHY (FONT SIZE & FONT FAMILY)

Theo yêu cầu chuẩn hóa giao diện tối giản và chuyên nghiệp, toàn bộ ứng dụng **chỉ sử dụng duy nhất 3 cỡ chữ** (không dùng bất kỳ cỡ chữ trung gian nào khác như 10, 11, 12, 13, 15, 16):

| Cấp bậc (Level) | Cỡ chữ (Point / Pixel) | Mục đích sử dụng |
| :--- | :---: | :--- |
| **Title** | **24** (`24px`) | Tiêu đề chính của ứng dụng, tiêu đề hộp thoại (Modal/Dialog Title) |
| **Header** | **20** (`20px`) | Tiêu đề khối (Sidebar Header, Card Title, Section Header, Bảng thống kê) |
| **Body** | **14** (`24px / 14px`) | Toàn bộ nội dung thông thường: Nút bấm (Button), Ô nhập liệu (Input), Nhãn (Label), Dòng dữ liệu (Table Rows/Cells), Thẻ số lượng (Badges), Tooltip |

### Phông chữ (Font Family) chuẩn
- **Web App**: Sử dụng phông chữ hệ thống tiêu chuẩn và phổ biến nhất trên web:
  ```css
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
- **Desktop (WPF)**: Sử dụng nghiêm ngặt phông chữ `Arial`:
  ```xml
  <FontFamily x:Key="AppFontFamily">Arial</FontFamily>
  ```

---

## 2. CHẾ ĐỘ HIỂN THỊ ĐỒ HỌA (GRAPHIC MODE: SHADED VS WIREFRAME)

Ứng dụng hỗ trợ chuyển đổi linh hoạt 2 chế độ hiển thị đồ họa:
1. **Shaded (Mặc định)**: Hiển thị khối 3D đặc, tính toán đổ bóng, ánh sáng, màu sắc gốc của file hoặc màu override/selection.
2. **Wireframe**: Hiển thị khung dây (Line/Edge Rendering), cho phép kỹ sư nhìn xuyên thấu cấu trúc hình học bên trong của mô hình BIM.

### Kiến trúc hiện thực trên Web (React 19 + Three.js)
- Trạng thái `graphicMode: 'shaded' | 'wireframe'` được quản lý tập trung trong `viewerStore.ts`.
- Khi chuyển đổi chế độ, Three.js cập nhật trực tiếp cờ `.wireframe` trên các `MeshStandardMaterial`:
  ```typescript
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => (m.wireframe = graphicMode === 'wireframe'));
      } else {
        child.material.wireframe = graphicMode === 'wireframe';
      }
    }
  });
  ```

### Kiến trúc hiện thực trên Desktop (WPF .NET 9 + HelixToolkit)
- WPF 3D không hỗ trợ cờ `wireframe` trực tiếp trên `DiffuseMaterial`.
- `HelixMeshBuilder.cs` cung cấp phương thức `CreateWireframeModel`:
  - Duyệt qua từng tam giác trong `Indices` của mô hình: $(v_0, v_1, v_2)$.
  - Tạo các đoạn thẳng cạnh viền: $(v_0, v_1)$, $(v_1, v_2)$, $(v_2, v_0)$.
  - Sử dụng `HelixToolkit.Wpf.LinesVisual3D` với độ dày đường nét tối ưu và xuất ra `GeometryModel3D`.
  - Kết quả được gán vào `Model3DGroup` hiển thị, hỗ trợ đầy đủ hit-testing và xoay quanh tâm.

---

## 3. HƯỚNG DẪN TRIỂN KHAI CHO MOBILE (MOBILE PORTING GUIDE)

Khi triển khai trên **React Native** (sử dụng `@react-three/fiber` hoặc Expo GL) hoặc **Flutter** (sử dụng Filament / OpenGL ES / Vulkan):

### 1. Typography trên Mobile
- Định nghĩa Theme Token với 3 hằng số cố định:
  ```typescript
  export const TYPOGRAPHY = {
    title: 24,
    header: 20,
    body: 14,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'Arial',
    }),
  };
  ```
- Không sử dụng font scale động làm vỡ layout các bảng Schedule hoặc thanh công cụ ViewModeBar.

### 2. Graphic Mode Wireframe trên Mobile
- **WebGL / Metal / Vulkan Shaders**:
  - Với WebGL/Three trên React Native: Kích hoạt `material.wireframe = true`.
  - Với native shader (OpenGL ES / Vulkan): Nếu thiết bị di động không hỗ trợ `glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)`, sử dụng kỹ thuật **Barycentric Coordinates Wireframe Shader** trong Fragment Shader để vẽ đường viền tam giác mượt mà mà không làm tăng số lượng draw calls.
