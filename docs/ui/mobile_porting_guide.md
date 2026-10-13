# HƯỚNG DẪN TRIỂN KHAI MOBILE (MOBILE PORTING GUIDE)

## 1. NGUYÊN TẮC THIẾT KẾ ĐỂ TÁI SỬ DỤNG SANG MOBILE
Để sau này triển khai Mobile (iOS/Android) nhanh nhất mà không phải làm lại từ đầu:

1. **Về mặt Logic (Headless / Core Model)**:
   - Các định dạng dữ liệu trong [`01_data_contract.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/architecture/01_data_contract.md) hoàn toàn độc lập với UI.
   - Các thuật toán tính toán Bounding Box, tính 6 mặt phẳng Clipping của Section Box ([`03_section_box_concept.md`](file:///c:/Users/Admin/Documents/antigravity/NMKBim/docs/architecture/03_section_box_concept.md)), raycasting được chuẩn hóa dưới dạng hàm toán học thuần (Pure Functions).

2. **Nếu chọn phương án Mobile bằng React Native / Expo**:
   - Tái sử dụng 100% Zustand Store (`viewerStore.ts`), Typescript Interfaces (`mesh.ts`, `properties.ts`), và từ điển i18n (`translation.json`).
   - Sử dụng `@react-three/fiber` phiên bản native (`expo-gl` + `three`) để render Canvas 3D.
   - Bảng Property 2 cột thay thế bằng `<FlatList>` tối ưu bộ nhớ.

3. **Nếu chọn phương án Mobile bằng .NET MAUI / C#**:
   - Tái sử dụng 100% `Core` class library từ Desktop WPF (.NET Standard / .NET 10).
   - Tái sử dụng các ViewModel MVVM (`PropertyInspectorViewModel`, `MainViewModel`).
   - Dùng SkiaSharp hoặc Silk.NET OpenGLES để vẽ 3D trên Android/iOS.
