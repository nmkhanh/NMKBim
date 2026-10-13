using System;
using System.IO;
using System.Reflection;
using System.Windows.Media.Imaging;
using Autodesk.Revit.UI;

namespace NMKBim_Revit
{
    public class App : IExternalApplication
    {
        public const string TabName = "NMKBim";
        public const string PanelName = "Export Tools";

        public Result OnStartup(UIControlledApplication application)
        {
            try
            {
                // 1. Tạo Ribbon Tab riêng nếu chưa có
                try
                {
                    application.CreateRibbonTab(TabName);
                }
                catch
                {
                    // Tab có thể đã được tạo bởi add-in khác của NMKBim
                }

                // 2. Lấy hoặc tạo Ribbon Panel
                RibbonPanel panel = null;
                var panels = application.GetRibbonPanels(TabName);
                foreach (var p in panels)
                {
                    if (p.Name.Equals(PanelName, StringComparison.OrdinalIgnoreCase))
                    {
                        panel = p;
                        break;
                    }
                }

                if (panel == null)
                {
                    panel = application.CreateRibbonPanel(TabName, PanelName);
                }

                // 3. Tạo PushButton cho tool Export Data
                string thisAssemblyPath = Assembly.GetExecutingAssembly().Location;
                var buttonData = new PushButtonData(
                    "NMKBim_ExportData",
                    "Export Data\n(JSON)",
                    thisAssemblyPath,
                    "NMKBim_Revit.Commands.ExportDataCommand"
                )
                {
                    ToolTip = "Chọn nhiều cấu kiện, bóc tách thành các khối Solid dưới dạng lưới tam giác kèm tất cả tham số và xuất ra file JSON.",
                    LongDescription = "Công cụ xuất dữ liệu thuộc bộ NMKBim_Revit: Hỗ trợ chọn nhiều đối tượng, tự động tách các khối Solid thành lưới tam giác (Vertices, Indices, Normals), thu thập toàn bộ Instance & Type Parameters, nhóm theo từng phần tử và lưu thành file JSON tương thích với NMKBim 3D Viewer."
                };

                // Tải icon nếu có
                string? assemblyDir = Path.GetDirectoryName(thisAssemblyPath);
                if (!string.IsNullOrEmpty(assemblyDir))
                {
                    string icon32Path = Path.Combine(assemblyDir, "Resources", "Icon32.png");
                    string icon16Path = Path.Combine(assemblyDir, "Resources", "Icon16.png");

                    if (File.Exists(icon32Path))
                    {
                        buttonData.LargeImage = new BitmapImage(new Uri(icon32Path, UriKind.Absolute));
                    }
                    if (File.Exists(icon16Path))
                    {
                        buttonData.Image = new BitmapImage(new Uri(icon16Path, UriKind.Absolute));
                    }
                }

                panel.AddItem(buttonData);

                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                TaskDialog.Show("NMKBim App Error", $"Không thể khởi tạo thanh công cụ NMKBim: {ex.Message}");
                return Result.Failed;
            }
        }

        public Result OnShutdown(UIControlledApplication application)
        {
            return Result.Succeeded;
        }
    }
}
