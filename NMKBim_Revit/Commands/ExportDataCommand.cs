using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using Autodesk.Revit.UI.Selection;
using NMKBim_Revit.Models;
using NMKBim_Revit.Services;

namespace NMKBim_Revit.Commands
{
    [Transaction(TransactionMode.Manual)]
    [Regeneration(RegenerationOption.Manual)]
    public class ExportDataCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            var uiapp = commandData.Application;
            var uidoc = uiapp.ActiveUIDocument;

            if (uidoc == null || uidoc.Document == null)
            {
                TaskDialog.Show("NMKBim Revit", "Vui lòng mở một dự án Revit trước khi thực hiện xuất dữ liệu.");
                return Result.Failed;
            }

            var doc = uidoc.Document;

            try
            {
                // 1. Cho phép người dùng Select Multi Elements
                var selectedElementIds = new List<ElementId>();
                var preSelection = uidoc.Selection.GetElementIds();

                if (preSelection != null && preSelection.Count > 0)
                {
                    selectedElementIds.AddRange(preSelection);
                }
                else
                {
                    // Nếu chưa chọn, bật chế độ chọn nhiều đối tượng với PickObjects
                    try
                    {
                        var pickedRefs = uidoc.Selection.PickObjects(
                            ObjectType.Element,
                            "NMKBim: Quét chọn các cấu kiện cần xuất dữ liệu, sau đó nhấn Finish trên thanh Options."
                        );

                        if (pickedRefs != null && pickedRefs.Count > 0)
                        {
                            foreach (var r in pickedRefs)
                            {
                                selectedElementIds.Add(r.ElementId);
                            }
                        }
                    }
                    catch (Autodesk.Revit.Exceptions.OperationCanceledException)
                    {
                        // Người dùng nhấn ESC để huỷ
                        return Result.Cancelled;
                    }
                }

                if (selectedElementIds.Count == 0)
                {
                    TaskDialog.Show("NMKBim Revit", "Chưa có đối tượng nào được chọn để xuất.");
                    return Result.Cancelled;
                }

                // Tự động phân rã (unpack) nếu có Group: Không xuất Group mà lấy toàn bộ Element bên trong
                var targetElementIds = UnpackElementsExcludingGroups(doc, selectedElementIds);

                if (targetElementIds.Count == 0)
                {
                    TaskDialog.Show("NMKBim Revit", "Các đối tượng hoặc Group được chọn không chứa cấu kiện hợp lệ nào để xuất.");
                    return Result.Cancelled;
                }

                // 2. Mở hộp thoại chọn folder và tên file JSON
                var saveDialog = new Microsoft.Win32.SaveFileDialog
                {
                    Title = "NMKBim - Chọn thư mục và đặt tên file JSON xuất dữ liệu",
                    Filter = "JSON Data File (*.json)|*.json|All Files (*.*)|*.*",
                    DefaultExt = ".json",
                    FileName = $"{SanitizeFileName(doc.Title)}_NMKBim_{DateTime.Now:yyyyMMdd_HHmmss}.json"
                };

                bool? dialogResult = saveDialog.ShowDialog();
                if (dialogResult != true || string.IsNullOrWhiteSpace(saveDialog.FileName))
                {
                    return Result.Cancelled;
                }

                string exportFilePath = saveDialog.FileName;

                // 3. Khởi tạo tài liệu xuất
                var exportDoc = new BimExportDocument
                {
                    Version = "1.0",
                    Metadata = new Dictionary<string, object>
                    {
                        { "name", doc.Title },
                        { "units", "m" },
                        { "upAxis", "Z" },
                        { "exportedDate", DateTime.Now.ToString("s") },
                        { "author", "NMKBim Revit Add-in" },
                        { "revitVersion", doc.Application.VersionNumber }
                    }
                };

                var options = new Options
                {
                    ComputeReferences = false,
                    IncludeNonVisibleObjects = false
                };

                if (doc.ActiveView != null)
                {
                    options.View = doc.ActiveView;
                }
                else
                {
                    options.DetailLevel = ViewDetailLevel.Fine;
                }

                int totalSolidsCount = 0;
                int totalTrianglesCount = 0;

                // 4. Bóc tách từng Element và nhóm các Solids thành phần
                foreach (var elemId in targetElementIds)
                {
                    var elem = doc.GetElement(elemId);
                    if (elem == null) continue;

                    // Lấy tất cả thông số thuộc tính (Instance + Type parameters)
                    var elementProperties = ParameterService.ExtractElementParameters(elem);

                    var elementGroup = new BimElementGroup
                    {
                        ElementId = elem.Id.GetIdValue(),
                        UniqueId = elem.UniqueId,
                        Category = elem.Category?.Name ?? "Unassigned",
                        FamilyName = elementProperties.TryGetValue("Family Name", out string? fam) ? fam : string.Empty,
                        TypeName = elementProperties.TryGetValue("Type Name", out string? tname) ? tname : string.Empty,
                        Name = elem.Name ?? $"Element {elem.Id.GetIdValue()}",
                        Properties = elementProperties
                    };

                    // Trích xuất toàn bộ các khối Solid / Rebar Meshes của Element
                    var solidMeshes = GeometryService.ExtractAllSolidMeshes(elem, doc, options, exportDoc.Materials);

                    for (int sIndex = 0; sIndex < solidMeshes.Count; sIndex++)
                    {
                        var solidMesh = solidMeshes[sIndex];

                        // Ghép properties của element vào properties của solid
                        foreach (var kv in elementProperties)
                        {
                            if (!solidMesh.Properties.ContainsKey(kv.Key))
                            {
                                solidMesh.Properties[kv.Key] = kv.Value;
                            }
                        }

                        elementGroup.Solids.Add(solidMesh);

                        // Đồng thời tạo SceneObjectDefinition để tương thích trực tiếp 100% với NMKBim 3D Viewer
                        var sceneObj = new SceneObjectDefinition
                        {
                            Id = solidMesh.SolidId,
                            Name = solidMesh.Name,
                            GroupId = elem.Id.GetIdValue().ToString(),
                            GroupName = elementGroup.Name,
                            MaterialId = solidMesh.MaterialId,
                            Vertices = solidMesh.Vertices,
                            Indices = solidMesh.Indices,
                            Normals = solidMesh.Normals,
                            Properties = new Dictionary<string, string>(elementProperties)
                        };

                        // Bổ sung các thông số hình học của solid vào scene object properties
                        foreach (var prop in solidMesh.Properties)
                        {
                            if (!sceneObj.Properties.ContainsKey(prop.Key))
                            {
                                sceneObj.Properties[prop.Key] = prop.Value;
                            }
                        }

                        exportDoc.Objects.Add(sceneObj);

                        totalSolidsCount++;
                        totalTrianglesCount += solidMesh.TriangleCount;
                    }

                    // Nếu element có ít nhất 1 solid thì đưa vào danh sách elements
                    if (elementGroup.Solids.Count > 0)
                    {
                        exportDoc.Elements.Add(elementGroup);
                    }
                }

                // Cập nhật metadata tổng số
                exportDoc.Metadata["totalElements"] = exportDoc.Elements.Count;
                exportDoc.Metadata["totalSolids"] = totalSolidsCount;
                exportDoc.Metadata["totalTriangles"] = totalTrianglesCount;

                // 5. Lưu ra file JSON
                JsonExportService.ExportToFile(exportDoc, exportFilePath);

                // 6. Hiển thị thông báo kết quả
                var taskDialog = new TaskDialog("NMKBim - Xuất dữ liệu hoàn tất")
                {
                    MainInstruction = "Đã xuất dữ liệu BIM và lưới tam giác thành công!",
                    MainContent = $"• Tổng số phần tử (Elements): {exportDoc.Elements.Count}\n" +
                                  $"• Tổng số khối hình học (Solids): {totalSolidsCount}\n" +
                                  $"• Tổng số tam giác (Triangles): {totalTrianglesCount:N0}\n\n" +
                                  $"Đường dẫn file:\n{exportFilePath}",
                    CommonButtons = TaskDialogCommonButtons.Ok
                };

                taskDialog.AddCommandLink(TaskDialogCommandLinkId.CommandLink1, "Mở thư mục chứa file xuất");

                var dialogRes = taskDialog.Show();
                if (dialogRes == TaskDialogResult.CommandLink1)
                {
                    Process.Start("explorer.exe", $"/select,\"{exportFilePath}\"");
                }

                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                message = ex.Message;
                TaskDialog.Show("NMKBim - Lỗi xuất dữ liệu", $"Đã xảy ra lỗi trong quá trình xuất:\n{ex.Message}\n\n{ex.StackTrace}");
                return Result.Failed;
            }
        }

        private static string SanitizeFileName(string fileName)
        {
            if (string.IsNullOrEmpty(fileName)) return "Project";
            foreach (char c in Path.GetInvalidFileNameChars())
            {
                fileName = fileName.Replace(c, '_');
            }
            return fileName.Trim();
        }

        /// <summary>
        /// Phân rã toàn bộ Group được chọn: Không chọn và không xuất Group, thay vào đó lấy toàn bộ Element thành phần bên trong.
        /// Hỗ trợ cả trường hợp Group lồng nhau (Nested Groups).
        /// </summary>
        private static List<ElementId> UnpackElementsExcludingGroups(Document doc, IEnumerable<ElementId> inputIds)
        {
            var resultSet = new HashSet<ElementId>();
            var queue = new Queue<ElementId>(inputIds);
            var visitedGroups = new HashSet<ElementId>();

            while (queue.Count > 0)
            {
                var id = queue.Dequeue();
                if (id == ElementId.InvalidElementId) continue;

                var elem = doc.GetElement(id);
                if (elem == null) continue;

                // Nếu là Group -> Lấy toàn bộ members bên trong và đưa vào hàng đợi
                if (elem is Group group)
                {
                    if (visitedGroups.Add(id))
                    {
                        var memberIds = group.GetMemberIds();
                        if (memberIds != null)
                        {
                            foreach (var memberId in memberIds)
                            {
                                queue.Enqueue(memberId);
                            }
                        }
                    }
                }
                else
                {
                    // Là element bình thường -> thêm vào danh sách xuất
                    resultSet.Add(id);
                }
            }

            return new List<ElementId>(resultSet);
        }
    }
}
