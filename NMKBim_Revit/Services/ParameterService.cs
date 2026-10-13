using System;
using System.Collections.Generic;
using Autodesk.Revit.DB;
using NMKBim_Revit.Models;

namespace NMKBim_Revit.Services
{
    public static class ParameterService
    {
        /// <summary>
        /// Trích xuất toàn bộ parameter (cả Instance và Type parameters) của Revit Element thành Dictionary<string, string>.
        /// </summary>
        public static Dictionary<string, string> ExtractElementParameters(Element elem)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (elem == null) return dict;

            var doc = elem.Document;

            // 1. Thêm các thông tin cơ bản
            dict["Element ID"] = elem.Id.GetIdValue().ToString();
            dict["Unique ID"] = elem.UniqueId;
            dict["Name"] = elem.Name ?? string.Empty;

            if (elem.Category != null)
            {
                dict["Category"] = elem.Category.Name;
            }

            // 2. Trích xuất Instance Parameters
            foreach (Parameter param in elem.Parameters)
            {
                if (param == null || !param.HasValue || param.Definition == null) continue;
                string name = param.Definition.Name;
                string value = FormatParameterValue(param, doc);
                if (!string.IsNullOrEmpty(name) && !dict.ContainsKey(name))
                {
                    dict[name] = value;
                }
            }

            // 3. Trích xuất Type Parameters (nếu có)
            var typeId = elem.GetTypeId();
            if (typeId != ElementId.InvalidElementId)
            {
                var typeElem = doc.GetElement(typeId);
                if (typeElem != null)
                {
                    dict["Type Name"] = typeElem.Name;
                    
                    if (typeElem is FamilySymbol famSymbol && famSymbol.Family != null)
                    {
                        dict["Family Name"] = famSymbol.Family.Name;
                    }

                    foreach (Parameter typeParam in typeElem.Parameters)
                    {
                        if (typeParam == null || !typeParam.HasValue || typeParam.Definition == null) continue;
                        string name = typeParam.Definition.Name;
                        string value = FormatParameterValue(typeParam, doc);
                        
                        // Nếu đã có từ instance param, thêm tiền tố [Type] để không mất dữ liệu
                        if (dict.ContainsKey(name))
                        {
                            dict[$"[Type] {name}"] = value;
                        }
                        else
                        {
                            dict[name] = value;
                        }
                    }
                }
            }

            return dict;
        }

        /// <summary>
        /// Định dạng giá trị của Revit Parameter theo StorageType
        /// </summary>
        public static string FormatParameterValue(Parameter param, Document doc)
        {
            if (param == null || !param.HasValue) return string.Empty;

            try
            {
                // Thử lấy chuỗi định dạng có đơn vị hiển thị
                string valStr = param.AsValueString();
                if (!string.IsNullOrWhiteSpace(valStr))
                {
                    return valStr.Trim();
                }

                switch (param.StorageType)
                {
                    case StorageType.String:
                        return param.AsString()?.Trim() ?? string.Empty;

                    case StorageType.Integer:
                        return param.AsInteger().ToString();

                    case StorageType.Double:
                        return Math.Round(param.AsDouble(), 4).ToString();

                    case StorageType.ElementId:
                        var elemId = param.AsElementId();
                        if (elemId == ElementId.InvalidElementId) return string.Empty;
                        var target = doc.GetElement(elemId);
                        return target != null ? target.Name : elemId.GetIdValue().ToString();

                    default:
                        return string.Empty;
                }
            }
            catch
            {
                return string.Empty;
            }
        }

        /// <summary>
        /// Trích xuất hoặc tạo MaterialInfo từ Revit Material
        /// </summary>
        public static MaterialInfo CreateMaterialInfo(Document doc, ElementId matId, string defaultName = "Default Material")
        {
            if (matId != ElementId.InvalidElementId && doc != null)
            {
                if (doc.GetElement(matId) is Material mat)
                {
                    string hexColor = $"#{mat.Color.Red:X2}{mat.Color.Green:X2}{mat.Color.Blue:X2}";
                    float opacity = Math.Max(0.0f, Math.Min(1.0f, (100 - mat.Transparency) / 100.0f));

                    return new MaterialInfo
                    {
                        Id = $"mat_{mat.Id.GetIdValue()}",
                        Name = mat.Name,
                        Color = hexColor,
                        Opacity = opacity,
                        Roughness = (mat.Smoothness / 100.0f),
                        Metalness = 0.1f
                    };
                }
            }

            return new MaterialInfo
            {
                Id = "mat_default",
                Name = defaultName,
                Color = "#94A3B8",
                Opacity = 1.0f,
                Roughness = 0.5f,
                Metalness = 0.0f
            };
        }
    }
}
