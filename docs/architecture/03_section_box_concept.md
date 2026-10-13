# SECTION BOX (HỘP CẮT KHÔNG GIAN 3D) & CLIPPING PLANES

## 1. NGUYÊN LÝ HOẠT ĐỘNG TOÁN HỌC

Section Box là một công cụ cắt trực quan kinh điển trong các phần mềm 3D/BIM (như Revit, Navisworks). Nó cho phép người dùng giới hạn không gian hiển thị của mô hình trong một hình hộp chữ nhật xác định bởi toạ độ:
$$\text{Box} = [X_{\min}, X_{\max}] \times [Y_{\min}, Y_{\max}] \times [Z_{\min}, Z_{\max}]$$

Mọi phần tử hoặc phần của tam giác nằm bên ngoài hộp này sẽ bị cắt bỏ (clipped) khi vẽ lên màn hình.

### 6 Mặt Phẳng Cắt (Clipping Planes):
Một mặt phẳng trong không gian 3D được biểu diễn dưới dạng phương trình chuẩn tắc:
$$\vec{n} \cdot \vec{p} + d = 0$$
Trong đó:
- $\vec{n} = (A, B, C)$ là vector pháp tuyến đơn vị hướng vào **vùng được giữ lại** (phía trong hộp).
- $d$ là khoảng cách hằng số.

| Mặt cắt (Plane) | Hướng cắt | Vector Pháp Tuyến $\vec{n}$ | Khoảng cách $d$ | Điều kiện giữ lại $(\vec{n} \cdot \vec{p} + d \ge 0)$ |
|---|---|---|---|---|
| **Mặt Trái (Min X)** | Cắt phía âm X | $(+1, 0, 0)$ | $-X_{\min}$ | $x - X_{\min} \ge 0 \iff x \ge X_{\min}$ |
| **Mặt Phải (Max X)** | Cắt phía dương X | $(-1, 0, 0)$ | $+X_{\max}$ | $-x + X_{\max} \ge 0 \iff x \le X_{\max}$ |
| **Mặt Trước (Min Y)** | Cắt phía âm Y | $(0, +1, 0)$ | $-Y_{\min}$ | $y - Y_{\min} \ge 0 \iff y \ge Y_{\min}$ |
| **Mặt Sau (Max Y)** | Cắt phía dương Y | $(0, -1, 0)$ | $+Y_{\max}$ | $-y + Y_{\max} \ge 0 \iff y \le Y_{\max}$ |
| **Mặt Đáy (Min Z)** | Cắt phía âm Z | $(0, 0, +1)$ | $-Z_{\min}$ | $z - Z_{\min} \ge 0 \iff z \ge Z_{\min}$ |
| **Mặt Đỉnh (Max Z)** | Cắt phía dương Z | $(0, 0, -1)$ | $+Z_{\max}$ | $-z + Z_{\max} \ge 0 \iff z \le Z_{\max}$ |

---

## 2. HIỆU NĂNG TỐI THƯỢNG (ZERO CPU CLIPPING)

Thay vì dùng CPU để tính toán giao cắt đa giác (Boolean Mesh Cut rất chậm và giật lag với mô hình lớn), cả Web và Desktop đều tận dụng **Hardware GPU Clipping**:
- **Web (Three.js)**: Kích hoạt `renderer.localClippingEnabled = true`, gắn mảng 6 `THREE.Plane` vào `material.clippingPlanes`. GPU sẽ dùng lệnh `discard` trong Pixel Shader cho bất kỳ fragment nào nằm ngoài hộp. Tốc độ giữ nguyên 60 FPS bất kể số lượng tam giác!
- **Desktop (DirectX / HelixToolkit SharpDX)**: Kích hoạt `ClippingPlaneCollection` tương ứng với thanh ghi clipping của DirectX 11, thực hiện tại pipeline rasterizer của card đồ hoạ.

---

## 3. UI VÀ TƯƠNG TÁC
1. Bật/Tắt Section Box qua toggle switch.
2. Cho phép kéo các thanh trượt $X_{\min}, X_{\max}, Y_{\min}, Y_{\max}, Z_{\min}, Z_{\max}$ tương ứng trong panel điều khiển.
3. Hiển thị khung dây (Wireframe Bounding Box) màu cam hoặc xanh lam bao quanh mô hình để người dùng biết phạm vi cắt.
