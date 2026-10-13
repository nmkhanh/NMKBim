# ĐIỀU KHIỂN VIEW KHÔNG GIAN RỘNG & VIEWCUBE GIZMO

## 1. BÀI TOÁN TẦM NHÌN TỪ 0.1MM ĐẾN 20KM (EXTREME DEPTH RANGE)
Trong các dự án BIM/GIS hoặc hạ tầng kỹ thuật, mô hình có thể chứa các chi tiết bu-lông/đai ốc siêu nhỏ ($0.1\text{ mm} = 0.0001\text{ m}$) trong khi toàn bộ dự án trải dài đến $20\text{ km}$ ($20,000\text{ m}$).

### Giải pháp kỹ thuật đạt hiệu năng tối đa:
1. **Logarithmic Depth Buffer**:
   - Web Three.js: Kích hoạt `renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true })`.
   - Cơ chế này thay đổi hàm ánh xạ chiều sâu $Z$ từ tuyến tính sang hàm logarit:
     $$z_{\text{buffer}} = \frac{\log(C \cdot z + 1)}{\log(C \cdot z_{\text{far}} + 1)}$$
   - **Lợi ích**: Tăng độ phân giải Z-buffer ở vùng cận cảnh mà vẫn giữ được độ sâu $50\text{ km}$, **triệt tiêu 100% hiện tượng Z-fighting (chớp nháy bề mặt khi hai mặt phẳng nằm gần nhau)**.
2. **Camera Range**:
   - `near = 0.001` (1mm), `far = 50000` (50km).

---

## 2. GIAO DIỆN VIEWCUBE CUBIC CHUYÊN NGHIỆP
Để định hướng không gian trực quan giống AutoCAD / Revit / Navisworks:

1. **Trên Web (Three.js)**:
   - Sử dụng package tiêu chuẩn: **`@mlightcad/three-viewcube`**.
   - Vị trí: Neo cố định góc trên bên phải (`ObjectPosition.RIGHT_TOP`).
   - Tự động đồng bộ góc xoay với camera chính, có la bàn la hướng (N, S, W, E), click vào các mặt TOP, FRONT, LEFT, ISO để chuyển góc nhìn tự động.

2. **Trên Desktop (WPF)**:
   - Control ViewCube tích hợp vòng la bàn định hướng (North, South, East, West) và khối rubic trung tâm thể hiện mặt chiếu hiện thời.
