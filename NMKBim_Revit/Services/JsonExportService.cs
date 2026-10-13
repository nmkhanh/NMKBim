using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using NMKBim_Revit.Models;

namespace NMKBim_Revit.Services
{
    public static class JsonExportService
    {
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        /// <summary>
        /// Xuất tài liệu BIM ra file JSON tại đường dẫn chỉ định
        /// </summary>
        public static void ExportToFile(BimExportDocument document, string filePath)
        {
            string? directory = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            string jsonString = JsonSerializer.Serialize(document, JsonOptions);
            File.WriteAllText(filePath, jsonString, System.Text.Encoding.UTF8);
        }
    }
}
