using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NMKBim_Revit.Models
{
    public class BimExportDocument
    {
        [JsonPropertyName("version")]
        public string Version { get; set; } = "1.0";

        [JsonPropertyName("metadata")]
        public Dictionary<string, object> Metadata { get; set; } = new Dictionary<string, object>();

        [JsonPropertyName("materials")]
        public Dictionary<string, MaterialInfo> Materials { get; set; } = new Dictionary<string, MaterialInfo>();

        /// <summary>
        /// Danh sách đối tượng nhóm theo Element, mỗi Element chứa toàn bộ các Solid thành phần và toàn bộ Parameters.
        /// </summary>
        [JsonPropertyName("elements")]
        public List<BimElementGroup> Elements { get; set; } = new List<BimElementGroup>();

        /// <summary>
        /// Danh sách phẳng các khối Solid tương thích trực tiếp 100% với NMKBim Viewer (Desktop WPF & Web Three.js).
        /// </summary>
        [JsonPropertyName("objects")]
        public List<SceneObjectDefinition> Objects { get; set; } = new List<SceneObjectDefinition>();
    }
}
