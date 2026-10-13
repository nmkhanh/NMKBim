# QUY ƯỚC HỆ TOẠ ĐỘ & TRỤC ĐỨNG (Z-AXIS IS UP)

## 1. NGUYÊN TẮC HỆ TOẠ ĐỘ NGÀNH BIM / CAD
Trong hầu hết các phần mềm BIM / Kiến trúc / Xây dựng (Revit, AutoCAD, Navisworks, Civil 3D, Tekla):
- **Trục $X$**: Trục nằm ngang (East / Chiều dài).
- **Trục $Y$**: Trục nằm ngang (North / Chiều rộng).
- **Trục $Z$**: **Trục thẳng đứng hướng lên trời (Elevation / Height / Level)**.

Mặc định thư viện WebGL / Three.js thường sử dụng $Y$ là trục đứng. Do đó, hệ thống NMKBim đã được cấu hình chuẩn hóa sang **$Z$ là trục đứng**:

---

## 2. TRIỂN KHAI TRÊN WEB (THREE.JS)
1. **Camera Up Vector**:
   ```typescript
   camera.up.set(0, 0, 1);
   ```
2. **Toạ độ cầu Orbit Navigation**:
   Hàm tính vị trí camera xoay quanh tâm mô hình $(x_0, y_0, z_0)$ với độ cao góc $\phi$ và góc quay $\theta$:
   ```typescript
   camera.position.x = target.x + radius * Math.cos(phi) * Math.sin(theta);
   camera.position.y = target.y + radius * Math.cos(phi) * Math.cos(theta);
   camera.position.z = target.z + radius * Math.sin(phi); // Z đại diện cho chiều cao
   ```
3. **Các góc nhìn chuẩn**:
   - **Mặt bằng (Top Plan)**: Camera đặt trên trục Z cao $(0, 0, 20)$ nhìn thẳng xuống $(0, 0, 0)$ với vector `up` hướng theo trục Y.
   - **Mặt cắt (Section Cut)**: Camera nhìn vuông góc theo phương ngang $(0, -20, z_{\text{cut}})$.

---

## 3. TRIỂN KHAI TRÊN DESKTOP (WPF / HELIX TOOLKIT)
- Helix Toolkit WPF mặc định hỗ trợ chuẩn kỹ thuật với trục $Z$ là trục đứng (`ModelVisual3D` và `HelixViewport3D` tự động map mặt `TOP` của ViewCube với trục $Z$).

---

## 4. HƯỚNG DẪN TRIỂN KHAI CHO MOBILE (SAU NÀY)
- Khi dùng `@react-three/fiber` hoặc `Three.js` trên React Native / Flutter, luôn thiết lập `camera.up.set(0, 0, 1)` ngay khi khởi tạo Canvas 3D.
