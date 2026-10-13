# HƯỚNG DẪN BẮT ĐẦU VÀ CHẠY DỰ ÁN (GETTING STARTED)

Hệ thống 3D High-Performance Viewer đa nền tảng gồm 2 project độc lập song song: **Desktop (C# WPF MVVM)** và **Web (React Vite Three.js)**, chia sẻ chung data contract và cấu trúc tài liệu module hóa.

---

## 1. DỰ ÁN WEB (TYPESCRIPT + REACT + THREE.JS)

### Cài đặt và chạy môi trường dev:
```bash
cd web
npm install
npm run dev
```
Trình duyệt sẽ mở tại `http://localhost:5173/`. 

### Các tính năng đã tích hợp sẵn:
- **3D Canvas (Three.js)**: Render trực tiếp mảng phẳng tam giác `vertices` & `indices`.
- **Hardware GPU Section Box**: Cắt khối thời gian thực với 6 mặt phẳng clipping planes (không dùng CPU Boolean).
- **Chế độ xem**: 3D Perspective, Top Plan (Mặt bằng), Section Cut (Mặt cắt).
- **Inspector Bảng 2 Cột**: Click chuột vào từng khối đối tượng trong không gian 3D sẽ highlight và hiển thị bảng thuộc tính `Name - Value`.
- **Hệ thống Theme**: Chuyển đổi Dark / Light mượt mà.
- **Đa ngôn ngữ (i18n)**: Hỗ trợ tiếng Anh (`en`), Đức (`de`), Nhật (`ja`).

---

## 2. DỰ ÁN DESKTOP (C# .NET 9/10, WPF, MVVM)

### Build và chạy:
```bash
dotnet build desktop/src/App/NMKBim.Desktop.csproj
dotnet run --project desktop/src/App/NMKBim.Desktop.csproj
```

### Kiến trúc chuẩn MVVM:
- **Core Library** (`NMKBim.Core`): Không dính dáng đến UI, chứa các models `ModelDocument`, `SceneObjectDefinition`, `PropertyItem`, `SectionBoxLimits`. Sẵn sàng tái sử dụng cho **Mobile (.NET MAUI)** trong tương lai.
- **MVVM Toolkit** (`CommunityToolkit.Mvvm`): Quản lý state bằng Source Generators siêu nhẹ.
- **Theme & Styles**: Tách biệt file riêng cho từng control (`ButtonStyle.xaml`, `DataGridStyle.xaml`, `Theme.Dark.xaml`, `Theme.Light.xaml`, `Fonts.xaml`).
- **DataGrid 2 Cột**: Hỗ trợ UI Virtualization tối ưu hiệu năng.
- **Đa ngôn ngữ**: Quản lý qua ResourceDictionary dynamic (`Strings.en.xaml`, `Strings.de.xaml`, `Strings.ja.xaml`).

---

## 3. DANH MỤC TÀI LIỆU CHI TIẾT (.MD)
Tất cả tài liệu phân tích và hướng dẫn kỹ thuật nằm trong thư mục [`docs/`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/):
- [`docs/architecture/00_overview_and_roadmap.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/architecture/00_overview_and_roadmap.md): Kiến trúc tổng thể và sơ đồ cây thư mục.
- [`docs/architecture/01_data_contract.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/architecture/01_data_contract.md): Đặc tả cấu trúc tam giác và properties.
- [`docs/architecture/03_section_box_concept.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/architecture/03_section_box_concept.md): Thuật toán 6 mặt phẳng cắt Section Box.
- [`docs/ui/themes_and_colors.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/ui/themes_and_colors.md): Hệ thống màu sắc và theme Dark/Light.
- [`docs/ui/localization_i18n.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/ui/localization_i18n.md): Bản dịch 3 ngôn ngữ En, De, Ja.
- [`docs/ui/mobile_porting_guide.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/ui/mobile_porting_guide.md): Hướng dẫn triển khai cho Mobile.
