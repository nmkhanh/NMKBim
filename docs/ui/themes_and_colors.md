# ĐẶC TẢ HỆ THỐNG GIAO DIỆN: THEMES & BẢNG MÀU

## 1. NGUYÊN TẮC THIẾT KẾ
- Đảm bảo tính nhất quán giữa cả 3 nền tảng: Desktop WPF, Web React và Mobile.
- Tương phản chuẩn WCAG 2.1 AA đối với chữ và dữ liệu kỹ thuật.
- Nền 3D Canvas hỗ trợ chuyển đổi màu nền tương thích với việc nhìn rõ khối hình 3D kỹ thuật.

---

## 2. COLOR PALETTE TOKENS

| Token Name | Dark Theme | Light Theme | Mục đích sử dụng |
|---|---|---|---|
| `--color-bg-base` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | Nền tổng thể ứng dụng |
| `--color-bg-surface` | `#1e293b` (Slate 800) | `#ffffff` (Trắng) | Nền các thanh công cụ, bảng thuộc tính |
| `--color-bg-viewport` | `#090d16` (Đen xanh) | `#e2e8f0` (Xám nhạt) | Nền không gian 3D Canvas |
| `--color-border` | `#334155` (Slate 700) | `#cbd5e1` (Slate 300) | Đường viền các panel, bảng 2 cột |
| `--color-text-main` | `#f1f5f9` (Slate 100) | `#0f172a` (Slate 900) | Văn bản chính, tiêu đề |
| `--color-text-muted` | `#94a3b8` (Slate 400) | `#64748b` (Slate 500) | Nhãn cột, giá trị thứ cấp |
| `--color-primary` | `#38bdf8` (Sky 400) | `#0284c7` (Sky 600) | Trạng thái active, chọn đối tượng |
| `--color-accent` | `#f59e0b` (Amber 500) | `#d97706` (Amber 600) | Khung Section Box, cảnh báo |
| `--color-highlight` | `#e11d48` (Rose 600) | `#e11d48` (Rose 600) | Vật thể được chọn trong 3D Viewport |

---

## 3. MAPPING SANG WPF RESOURCE DICTIONARY (DESKTOP)
Trong WPF, các token trên được map tương ứng thành `SolidColorBrush` trong `Theme.Dark.xaml` và `Theme.Light.xaml`:
```xml
<!-- Dark Theme Brush Mapping -->
<SolidColorBrush x:Key="BgBaseBrush" Color="#0F172A"/>
<SolidColorBrush x:Key="BgSurfaceBrush" Color="#1E293B"/>
<SolidColorBrush x:Key="BgViewportBrush" Color="#090D16"/>
<SolidColorBrush x:Key="BorderBrush" Color="#334155"/>
<SolidColorBrush x:Key="TextMainBrush" Color="#F1F5F9"/>
<SolidColorBrush x:Key="TextMutedBrush" Color="#94A3B8"/>
<SolidColorBrush x:Key="PrimaryBrush" Color="#38BDF8"/>
<SolidColorBrush x:Key="HighlightBrush" Color="#E11D48"/>
```

---

## 4. MAPPING SANG CSS VARIABLES (WEB)
```css
/* theme-dark */
:root[data-theme='dark'] {
  --color-bg-base: #0f172a;
  --color-bg-surface: #1e293b;
  --color-bg-viewport: #090d16;
  --color-border: #334155;
  --color-text-main: #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-primary: #38bdf8;
  --color-highlight: #e11d48;
}

/* theme-light */
:root[data-theme='light'] {
  --color-bg-base: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-bg-viewport: #e2e8f0;
  --color-border: #cbd5e1;
  --color-text-main: #0f172a;
  --color-text-muted: #64748b;
  --color-primary: #0284c7;
  --color-highlight: #e11d48;
}
```
