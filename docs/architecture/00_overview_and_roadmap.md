# KIẾN TRÚC TỔNG THỂ HỆ THỐNG 3D VIEWER ĐA NỀN TẢNG (DESKTOP & WEB & MOBILE-READY)

## 1. TỔNG QUAN YÊU CẦU & MỤC TIÊU CỐT LÕI
- **Mục đích**: Ứng dụng tương tác và hiển thị (view) mô hình 3D từ các phần mềm 3D/BIM/CAD.
- **Dữ liệu đầu vào**: Dữ liệu dạng mesh tam giác (`Triangle / Indices / Vertices / Normals`) và bảng thuộc tính metadata (`Properties: Name - Value`) theo từng object/khối hình.
- **Tiêu chí tối thượng**: **Siêu nhẹ, hiệu năng cao nhất (High Performance & Low Memory)**, render mượt mà tập dữ liệu lớn.
- **Nền tảng**:
  1. **Desktop**: C# (.NET 10/9), **WPF**, mô hình kiến trúc **MVVM chuẩn mực**.
  2. **Web**: **TypeScript + React + Vite + Three.js** (hoặc WebGL/WebGPU wrapper siêu nhẹ).
  3. **Mobile (Giai đoạn sau)**: Chuẩn bị sẵn kiến trúc logic & cấu trúc docs/UI specification (React Native hoặc .NET MAUI / Flutter) để tái sử dụng ngay toàn bộ mô hình dữ liệu.
- **Hệ thống Design & UI**:
  - Tách bạch file setup, style riêng biệt cho từng Control / Component.
  - Quản lý tập trung: Theme (Dark / Light), Font, Color, Spacing, Iconography.
- **Đa ngôn ngữ (i18n)**: Tiếng Anh (English - `en`), Tiếng Đức (Deutsch - `de`), Tiếng Nhật (日本語 - `ja`).
- **Góc nhìn & Chế độ View**:
  - Chế độ phối cảnh 3D (Perspective 3D).
  - Mặt bằng (Top / Plan - Orthographic).
  - Mặt cắt (Section / Elevation - Orthographic).
  - **Section Box 3D**: Hộp cắt không gian với 6 mặt phẳng clipping (`Clipping Planes`), có gizmo/tay kéo để cắt khối mô hình trực quan trong thời gian thực.
- **Hệ thống Tài liệu (.md)**:
  - Chia rõ nhóm `UI` và `Logic`.
  - Có file con chi tiết cho từng component và từng function.

---

## 2. LỰA CHỌN CÔNG NGHỆ & ĐỘNG CƠ RENDER SIÊU NHẸ (HIGH PERFORMANCE)

### 2.1. Desktop (C#, WPF, MVVM)
* **Framework**: .NET 10 / .NET 9 WPF (hỗ trợ AOT/ReadyToRun, tối ưu GC).
* **3D Engine đề xuất**:
  * **Phương án tối ưu nhất**: **Helix Toolkit (SharpDX / DirectX11 Core)** (`HelixToolkit.Wpf.SharpDX`).
    * *Lý do*: Dùng DirectX 11 trực tiếp qua D3DImage của WPF, bypass pipeline render cũ kỹ và nặng nề của `System.Windows.Media.Media3D`. Hỗ trợ Hardware Instancing, custom shaders, native clipping planes (cho Section Box), cực kỳ nhẹ và nhanh khi render hàng trăm nghìn tam giác.
  * *Phương án tối giản nhất (Zero heavy dependencies)*: **Silk.NET / OpenGL / DirectX swapchain**. (Tuy nhiên HelixToolkit.SharpDX đã cực kỳ ổn định và chuẩn MVVM cho WPF).
* **Kiến trúc WPF**:
  * MVVM Toolkit (`CommunityToolkit.Mvvm`): Nhẹ nhất, dùng Source Generators, không overhead runtime reflection.
  * Data Binding tối ưu hóa: `OneWay` binding mặc định cho bảng Properties; VirtualizingStackPanel cho bảng dữ liệu lớn.

### 2.2. Web (Vite + TypeScript + Three.js)
* **Framework**: **React 19 + TypeScript + Vite** (build siêu nhanh, bundle nhỏ gọn).
* **3D Engine**: **Three.js** (tận dụng `BufferGeometry`, `InstancedMesh`, `BatchedMesh` mới nhất để giảm draw calls xuống mức tối thiểu).
* **State Management & UI**:
  * State: **Zustand** (nhẹ < 3KB, không gây re-render thừa cho 3D Canvas).
  * Styling: Scoped CSS modules kết hợp CSS Variables (`--color-bg`, `--color-primary`...) cho Dark/Light theme.
* **i18n**: `i18next` / `react-i18next` hỗ trợ `en`, `de`, `ja`.

### 2.3. Định dạng dữ liệu trao đổi chuẩn (Schema-agnostic binary / JSON)
* Dữ liệu hình học được chuẩn hóa về định dạng nhị phân/Float32Array phẳng:
  * `vertices`: `Float32Array [x, y, z, ...]`
  * `indices`: `Uint32Array [i1, i2, i3, ...]`
  * `normals`: `Float32Array [nx, ny, nz, ...]`
  * `objects`: Mảng các sub-mesh có `id`, `name`, `color`, `materialRef`, `properties: { [key: string]: string }`.

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT DIRECTORY TREE)

```text
NMKBim/
├── docs/                                  # HỆ THỐNG TÀI LIỆU TOÀN DIỆN (.MD)
│   ├── architecture/                      # Kiến trúc tổng thể & Data Schema
│   │   ├── 00_overview_and_roadmap.md     # Bản đồ tổng quan
│   │   ├── 01_data_contract.md            # Đặc tả cấu trúc Triangle Mesh & Properties
│   │   ├── 02_coordinate_system.md        # Hệ toạ độ, Camera, Matrix transforms
│   │   └── 03_section_box_concept.md      # Thuật toán & toán học Section Box (6 clipping planes)
│   ├── logic/                             # Chi tiết Logic functions
│   │   ├── geometry_processing.md         # Phân tích & nạp mảng vertices, indices, normals
│   │   ├── raycasting_selection.md        # Thuật toán click / pick đối tượng 3D
│   │   ├── camera_modes.md                # 3D Perspective vs Orthographic (Top, Section)
│   │   ├── section_box_clipping.md        # Quản lý 6 mặt phẳng cắt & Gizmo handles
│   │   └── material_pipeline.md           # Shader, PBR / Flat / Phong materials & colors
│   ├── ui/                                # Chi tiết UI, Styling, Theme, i18n
│   │   ├── themes_and_colors.md           # Tokens: Dark/Light, Bảng màu semantic
│   │   ├── typography_fonts.md            # Phông chữ đa ngôn ngữ (EN, DE, JA)
│   │   ├── localization_i18n.md           # Bản dịch 3 ngôn ngữ En, De, Ja
│   │   ├── components/                    # Đặc tả từng control / component
│   │   │   ├── viewport_3d.md             # Khung nhìn 3D Canvas / DirectX Viewport
│   │   │   ├── property_grid.md           # Bảng 2 cột Name - Value (Properties Inspector)
│   │   │   ├── view_cube_toolbar.md       # Thanh chuyển góc nhìn (3D, Top, Section)
│   │   │   ├── section_box_control.md     # Bật tắt & điều khiển Section Box
│   │   │   └── material_palette.md        # Bộ gán màu & vật liệu cho đối tượng
│   │   └── mobile_porting_guide.md        # Hướng dẫn chi tiết triển khai Mobile sau này
│   └── README.md
│
├── desktop/                               # ỨNG DỤNG DESKTOP (WPF .NET 10, C#, MVVM)
│   ├── NMKBim.Desktop.sln
│   └── src/
│       ├── Core/                          # Thư viện thuần C# không dính UI (Portable / Shared)
│       ├── UI/                            # Tách biệt UI: Themes, Styles, Controls
│       └── App/                           # Entry point & ViewModels (MVVM)
│
├── web/                                   # ỨNG DỤNG WEB (TypeScript, React, Three.js)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── core/                          # Data Models & 3D Render Engine siêu nhẹ
│       ├── ui/                            # Themes, Typography, Components
│       ├── state/                         # Zustand store
│       └── i18n/                          # Multi-language configuration
│
└── shared-samples/                        # DỮ LIỆU MẪU MÔ HÌNH TAM GIÁC + PROPERTIES
    ├── sample_cube_with_props.json        # Dữ liệu hình học tam giác + metadata demo
    └── sample_building_block.json
```
