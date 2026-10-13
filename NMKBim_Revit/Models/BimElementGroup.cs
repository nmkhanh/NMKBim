using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NMKBim_Revit.Models
{
    public class BimElementGroup
    {
        [JsonPropertyName("elementId")]
        public long ElementId { get; set; }

        [JsonPropertyName("uniqueId")]
        public string UniqueId { get; set; } = string.Empty;

        [JsonPropertyName("category")]
        public string Category { get; set; } = string.Empty;

        [JsonPropertyName("familyName")]
        public string FamilyName { get; set; } = string.Empty;

        [JsonPropertyName("typeName")]
        public string TypeName { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("solidCount")]
        public int SolidCount => Solids?.Count ?? 0;

        [JsonPropertyName("properties")]
        public Dictionary<string, string> Properties { get; set; } = new Dictionary<string, string>();

        [JsonPropertyName("solids")]
        public List<BimSolidMesh> Solids { get; set; } = new List<BimSolidMesh>();
    }
}
