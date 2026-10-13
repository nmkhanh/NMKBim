# NMKBim_Revit - Bộ Công Cụ Revit Add-in & Data Exporter Đa Nền Tảng

Bộ công cụ **NMKBim_Revit** được thiết kế để trích xuất dữ liệu hình học 3D (Solid Triangulation Mesh) và toàn bộ thông số thuộc tính (BIM Parameters) từ Autodesk Revit sang định dạng JSON chuẩn hoá, tương thích trực tiếp 100% với hệ sinh thái **NMKBim 3D Viewer** (cả bản Desktop C# WPF và Web Three.js).

---

## 1. CÁC TÍNH NĂNG CHÍNH

- **Multi-Selection Thông Minh & Tự Động Phân Rã Group**:
  - Hỗ trợ chọn trước (pre-selection) các cấu kiện trong Revit rồi nhấn nút.
  - Hoặc nếu chưa chọn, công cụ sẽ tự động kích hoạt chế độ quét chọn nhiều đối tượng (`PickObjects`).
  - **Không chọn Group**: Nếu người dùng quét chọn trúng Group (kể cả Group lồng nhau - Nested Groups), công cụ sẽ **tự động bóc tách và lấy toàn bộ các cấu kiện bên trong Group** để xuất, bỏ qua Group container. Đảm bảo không bỏ sót bất kỳ hình học nào và không xuất trùng lặp.
- **Bóc Tách & Tam Giác Hóa Solid (Triangulation)**:
  - Tách triệt để từng khối `Solid` trong cấu kiện (hỗ trợ cả DirectShape, In-Place Families, FamilyInstance, Nested Geometry).
  - Tự động lọc bỏ các solid rỗng/không có thể tích.
  - Triangulate từng mặt (`Face.Triangulate()`) thành các mảng phẳng đỉnh `vertices`, chỉ số mặt `indices`, và vector pháp tuyến `normals`.
  - Tự động deduplicate các đỉnh trùng lặp giúp tối ưu dung lượng file JSON và tương thích tối đa với GPU Index Buffer.
  - Chuyển đổi chuẩn tọa độ từ Feet (Revit nội bộ) sang Mét (chuẩn hệ SI quốc tế).
- **Trích Xuất Toàn Bộ Parameter & Value**:
  - Đọc toàn bộ **Instance Parameters** và **Type Parameters** của phần tử.
  - Nhận diện đơn vị hiển thị chuẩn (`AsValueString`), chuỗi, số, liên kết vật liệu và level.
- **Nhóm Solid Theo Từng Element**:
  - Nếu một cấu kiện (Element) có nhiều khối Solid, công cụ tự động gom chúng thành 1 nhóm đại diện cho phần tử đó (`elements[].solids[]`).
  - Mỗi solid mang đầy đủ các thông số riêng (thể tích, diện tích xung quanh, số lượng tam giác) và thừa hưởng toàn bộ thuộc tính của element.
- **Tương Thích Ngay Lập Tức Với NMKBim 3D Viewer**:
  - Tự động xuất kèm mảng phẳng `objects` để có thể mở và hiển thị 3D ngay lập tức trên Desktop WPF Viewer và Web Three.js Viewer của NMKBim.
- **Hộp Thoại Chọn Thư Mục & Đặt Tên File JSON**:
  - Hỗ trợ hộp thoại `SaveFileDialog` trực quan, cho phép người dùng tùy ý chọn thư mục lưu trữ và đặt tên file `.json`.

---

## 2. CẤU TRÚC THƯ MỤC

```text
NMKBim_Revit/
├── NMKBim_Revit.csproj           # Cấu hình đa nền tảng (Revit 2020-2024 .NET 4.8 & Revit 2025-2027 .NET 10)
├── NMKBim_Revit.addin            # Manifest đăng ký Add-in với Revit
├── App.cs                        # Khởi tạo Ribbon Tab "NMKBim" & Panel "Export Tools"
├── Commands/
│   └── ExportDataCommand.cs      # Lệnh thực thi xuất dữ liệu: multi-selection, triangulation, dialog, JSON
├── Services/
│   ├── GeometryService.cs        # Xử lý hình học: Bóc tách Solid, Triangulate Face, tính pháp tuyến
│   ├── ParameterService.cs       # Trích xuất toàn bộ tham số Element & Type, vật liệu
│   ├── JsonExportService.cs      # Tuần tự hóa JSON với UTF-8 và định dạng đẹp
│   └── ElementIdExtensions.cs    # Tương thích chéo phiên bản Revit API (32-bit vs 64-bit ElementId)
├── Models/
│   ├── BimExportDocument.cs      # Cấu trúc gốc tài liệu JSON
│   ├── BimElementGroup.cs        # Nhóm Element chứa danh sách các Solid thành phần
│   ├── BimSolidMesh.cs           # Dữ liệu hình học tam giác và thuộc tính của từng Solid
│   ├── SceneObjectDefinition.cs  # Chuẩn đối tượng tương thích với NMKBim Viewer
│   └── MaterialInfo.cs           # Thông tin màu sắc và độ trong suốt vật liệu
├── Resources/
│   ├── Icon16.png                # Icon Ribbon 16x16
│   └── Icon32.png                # Icon Ribbon 32x32
├── NMKBim_PyRevit.extension/     # Phiên bản pyRevit Extension (dành cho người dùng pyRevit)
│   └── NMKBim.tab/Export.panel/ExportData.pushbutton/
│       ├── script.py
│       ├── bundle.yaml
│       └── icon.png
├── install.ps1                   # Script cài đặt tự động cho tất cả các phiên bản Revit
├── install.bat                   # File click đúp để chạy cài đặt nhanh
└── README.md
```

---

## 3. HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG

### CÁCH 1: Cài Đặt Tự Động Native C# Add-in (Khuyên Dùng)
1. Đóng ứng dụng Autodesk Revit nếu đang mở.
2. Click đúp vào file [`install.bat`](file:///h:/My%20Drive/NMKBim/NMKBim_Revit/install.bat) (hoặc chạy lệnh `powershell .\install.ps1`).
3. Script sẽ tự động:
   - Biên dịch project C# với cấu hình tối ưu.
   - Sao chép toàn bộ DLL và file manifest `.addin` vào thư mục Addins của tất cả phiên bản Revit tìm thấy trên máy (từ Revit 2020 đến Revit 2027).
4. Mở Revit lên:
   - Trên thanh Ribbon sẽ xuất hiện tab mới: **NMKBim**.
   - Tại panel **Export Tools**, click nút **Export Data (JSON)**.
   - Quét chọn các cấu kiện trên màn hình 3D/mặt bằng, chọn thư mục và đặt tên file `.json` để xuất!

### CÁCH 2: Sử Dụng Thông Qua pyRevit
Nếu bạn đang sử dụng hệ sinh thái pyRevit:
1. Sao chép thư mục [`NMKBim_PyRevit.extension`](file:///h:/My%20Drive/NMKBim/NMKBim_Revit/NMKBim_PyRevit.extension) vào thư mục extensions của pyRevit:
   - Mặc định: `%APPDATA%\pyRevit\Extensions\NMKBim_PyRevit.extension`
2. Mở Revit và tải lại pyRevit (`pyRevit -> Reload`).
3. Tab **NMKBim** sẽ xuất hiện với nút **Export Data (JSON)**.

---

## 4. ĐỊNH DẠNG DỮ LIỆU JSON ĐƯỢC XUẤT RA

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Project1.rvt",
    "units": "m",
    "upAxis": "Z",
    "exportedDate": "2026-10-11T01:08:00",
    "author": "NMKBim Revit Add-in",
    "totalElements": 2,
    "totalSolids": 3,
    "totalTriangles": 36
  },
  "materials": {
    "mat_12345": {
      "id": "mat_12345",
      "name": "Concrete, Cast-in-Place gray",
      "color": "#94A3B8",
      "opacity": 1.0,
      "roughness": 0.8,
      "metalness": 0.1
    }
  },
  "elements": [
    {
      "elementId": 321456,
      "uniqueId": "a1b2c3d4-...",
      "category": "Structural Columns",
      "familyName": "M_Concrete-Rectangular-Column",
      "typeName": "600 x 600mm",
      "name": "Column C1",
      "solidCount": 1,
      "properties": {
        "Element ID": "321456",
        "Category": "Structural Columns",
        "Family Name": "M_Concrete-Rectangular-Column",
        "Type Name": "600 x 600mm",
        "Volume": "1.08 m³",
        "Base Level": "Level 1",
        "Top Level": "Level 2"
      },
      "solids": [
        {
          "solidIndex": 0,
          "solidId": "321456_solid_0",
          "name": "Column C1 (Solid 1)",
          "materialId": "mat_12345",
          "materialName": "Concrete, Cast-in-Place gray",
          "volume": 1.08,
          "surfaceArea": 7.92,
          "triangleCount": 12,
          "vertices": [-0.3, -0.3, 0.0, 0.3, -0.3, 0.0, ...],
          "indices": [0, 1, 2, 0, 2, 3, ...],
          "normals": [0.0, 0.0, -1.0, ...],
          "properties": {
            "Solid Index": "1",
            "Volume (m³)": "1.08",
            "Surface Area (m²)": "7.92",
            "Triangles": "12",
            "Material": "Concrete, Cast-in-Place gray"
          }
        }
      ]
    }
  ],
  "objects": [
    {
      "id": "321456_solid_0",
      "name": "Column C1 (Solid 1)",
      "groupId": "321456",
      "groupName": "Column C1",
      "materialId": "mat_12345",
      "vertices": [-0.3, -0.3, 0.0, 0.3, -0.3, 0.0, ...],
      "indices": [0, 1, 2, 0, 2, 3, ...],
      "normals": [0.0, 0.0, -1.0, ...],
      "properties": { ... }
    }
  ]
}
```
