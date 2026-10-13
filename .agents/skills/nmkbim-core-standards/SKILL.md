---
name: nmkbim-core-standards
description: >-
  Quy chuẩn phát triển và cập nhật bắt buộc cho dự án 3D Model Viewer NMKBim.
  Đảm bảo luôn cập nhật song song cả Web và Desktop, tự động build WPF và tạo tài liệu md chi tiết cho Mobile.
---

# QUY CHUẨN PHÁT TRIỂN DỰ ÁN 3D VIEWER NMKBIM

Mỗi khi phát triển, thêm tính năng, hoặc sửa đổi bất kỳ logic/UI nào trong dự án **NMKBim**, luôn tuân thủ 3 nguyên tắc bất di bất dịch sau:

## 1. NGUYÊN TẮC SONG HÀNH BẮT BUỘC (WEB & DESKTOP PARITY)
- Mọi tính năng mới (tương tác chuột, phím tắt, góc nhìn camera, quản lý file, thuộc tính, vật liệu...) phải được triển khai đồng thời trên **cả 2 nền tảng**:
  1. **Web**: TypeScript + React 19 + Three.js (`h:\My Drive\NMKBim\web`).
  2. **Desktop**: C# .NET 9 WPF + MVVM Toolkit + HelixToolkit.Wpf (`h:\My Drive\NMKBim\desktop`).
- Không được để tồn tại tính năng trên một nền tảng mà thiếu trên nền tảng còn lại.

## 2. QUY TẮC TỰ ĐỘNG BIÊN DỊCH VÀ XÁC THỰC RUN DESKTOP (ALWAYS BUILD & RUN TEST)
- **Desktop WPF**:
  - Luôn chạy lệnh `dotnet build desktop/src/App/NMKBim.Desktop.csproj` sau mỗi lần sửa đổi code C# hoặc XAML, đảm bảo `0 Warning(s), 0 Error(s)`.
  - **Bắt buộc luôn run thử ứng dụng Desktop** (hoặc chạy test runtime) để kiểm tra có lỗi runtime/crash/văng app hay không và sửa ngay lập tức trước khi hoàn tất task.
  - Luôn đảm bảo ứng dụng chạy mượt mà, không bị lock tiến trình trên ổ đĩa Google Drive ảo thông qua cấu hình `Directory.Build.props`.
- **Web App**:
  - Luôn kiểm tra tính toàn vẹn qua `npm run build` và giữ Dev Server sẵn sàng tại cổng `http://localhost:5173/`.

## 3. TÀI LIỆU HÓA CHI TIẾT (.MD) ĐỊNH HƯỚNG MOBILE PORTING
- Mỗi nhóm chức năng phải có file tài liệu `.md` tương ứng trong thư mục `docs/`.
- Phân nhóm rõ ràng:
  - `docs/ui/components/`: Tài liệu đặc tả từng component / control (giao diện, style, theme, phông chữ, tương tác).
  - `docs/logic/`: Tài liệu chi tiết logic code, thuật toán hình học, camera, clipping planes.
- Trong mỗi file `.md` **luôn luôn có mục "Hướng dẫn triển khai cho Mobile (Mobile Porting Guide)"** để sau này đội ngũ dễ dàng tái sử dụng trên React Native hoặc .NET MAUI / Flutter.

## 4. QUY TẮC HIỆN THỰC HÓA 3D VÀ HIỆU NĂNG CAO
- Tầm nhìn camera phải bao phủ từ chi tiết $0.1\text{ mm}$ đến vùng quy hoạch $20\text{ km}$ bằng **Logarithmic Depth Buffer** (Web) và cấu hình Z-clipping tối ưu (Desktop) để triệt tiêu Z-fighting.
- Có khối cubic **ViewCube** điều hướng định hướng không gian ở góc trên bên phải.
- Cơ chế ẩn/hiện file mô hình: Khi bỏ tick Checkbox, mô hình phải được **ẩn hoàn toàn khỏi không gian render**, giải phóng GPU.
- Hỗ trợ thao tác chuột CAD/BIM chuẩn mực:
  - Nhấn đúp chuột giữa 2 lần liên tiếp: **Zoom to Fit (Zoom Extents)** vào các đối tượng đang còn hiển thị.
  - Chuột phải: Menu ngữ cảnh **Isolate**, **Hide**, **Reset Visibility**.
