using System.Text.Json.Serialization;

namespace NMKBim_Revit.Models
{
    public class MaterialInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("color")]
        public string Color { get; set; } = "#808080";

        [JsonPropertyName("opacity")]
        public float Opacity { get; set; } = 1.0f;

        [JsonPropertyName("roughness")]
        public float Roughness { get; set; } = 0.5f;

        [JsonPropertyName("metalness")]
        public float Metalness { get; set; } = 0.0f;
    }
}
