# ĐẶC TẢ HỢP ĐỒNG DỮ LIỆU (DATA CONTRACT SPECIFICATION)

## 1. MỤC TIÊU
Đặc tả định dạng dữ liệu hình học tam giác (Triangle Mesh) và bảng thuộc tính (Properties) dùng chung cho cả 3 nền tảng: **Desktop (C#)**, **Web (TypeScript)** và **Mobile**. Định dạng này được thiết kế để:
1. Parse siêu nhanh (Zero CPU transformation hoặc mảng phẳng trực tiếp).
2. Tương thích trực tiếp với GPU Buffer (`Float32Array`, `DirectX 11 VertexBuffer`).
3. Dễ dàng nén và truyền tải qua mạng hoặc file nhị phân.

---

## 2. CẤU TRÚC JSON DATA SCHEMA

```typescript
export interface ModelDocument {
  version: "1.0";
  metadata: {
    name: string;
    units: "mm" | "cm" | "m";
    upAxis: "Y" | "Z";
    author?: string;
  };
  materials: Record<string, MaterialDefinition>;
  objects: SceneObjectDefinition[];
}

export interface MaterialDefinition {
  id: string;
  name: string;
  color: string;           // Hex color VD: "#3B82F6"
  opacity: number;         // 0.0 - 1.0
  roughness?: number;      // 0.0 - 1.0
  metalness?: number;      // 0.0 - 1.0
  wireframe?: boolean;
}

export interface SceneObjectDefinition {
  id: string;              // UUID hoặc mã duy nhất của phần tử BIM/CAD
  name: string;            // Tên hiển thị VD: "Cột B1", "Dầm D5"
  materialId: string;      // Tham chiếu đến key trong bảng materials
  
  // DỮ LIỆU LƯỚI TAM GIÁC PHẲNG (FLAT BUFFERS)
  // Mỗi 3 số thực liên tiếp tạo thành 1 toạ độ đỉnh (x, y, z)
  vertices: number[];      // [x0, y0, z0, x1, y1, z1, ...]
  
  // Mỗi 3 chỉ số tạo thành 1 tam giác tham chiếu vào mảng vertices
  indices: number[];       // [i0, i1, i2, i3, i4, i5, ...]
  
  // Pháp tuyến cho mỗi đỉnh (độ dài bằng mảng vertices)
  normals?: number[];      // [nx0, ny0, nz0, nx1, ny1, nz1, ...]
  
  // Toạ độ vân bề mặt (tuỳ chọn)
  uvs?: number[];          // [u0, v0, u1, v1, ...]
  
  // BẢNG THUỘC TÍNH (NAME - VALUE)
  // Hiển thị trực tiếp lên bảng 2 cột Inspector
  properties: Record<string, string>;
}
```

---

## 3. TƯƠNG ĐƯƠNG TRONG C# (DESKTOP WPF / MVVM)

```csharp
namespace NMKBim.Core.Models
{
    public class ModelDocument
    {
        public string Version { get; set; } = "1.0";
        public ModelMetadata Metadata { get; set; } = new();
        public Dictionary<string, MaterialDefinition> Materials { get; set; } = new();
        public List<SceneObjectDefinition> Objects { get; set; } = new();
    }

    public class MaterialDefinition
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = "#808080";
        public float Opacity { get; set; } = 1.0f;
        public float Roughness { get; set; } = 0.5f;
        public float Metalness { get; set; } = 0.0f;
    }

    public class SceneObjectDefinition
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string MaterialId { get; set; } = string.Empty;
        
        public float[] Vertices { get; set; } = Array.Empty<float>();
        public int[] Indices { get; set; } = Array.Empty<int>();
        public float[]? Normals { get; set; }
        
        // Bảng 2 cột Name - Value
        public Dictionary<string, string> Properties { get; set; } = new();
    }
}
```
