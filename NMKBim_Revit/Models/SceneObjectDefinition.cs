using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NMKBim_Revit.Models
{
    public class SceneObjectDefinition
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("groupId")]
        public string GroupId { get; set; } = string.Empty;

        [JsonPropertyName("groupName")]
        public string GroupName { get; set; } = string.Empty;

        [JsonPropertyName("materialId")]
        public string MaterialId { get; set; } = string.Empty;

        [JsonPropertyName("vertices")]
        public List<float> Vertices { get; set; } = new List<float>();

        [JsonPropertyName("indices")]
        public List<int> Indices { get; set; } = new List<int>();

        [JsonPropertyName("normals")]
        public List<float>? Normals { get; set; }

        [JsonPropertyName("properties")]
        public Dictionary<string, string> Properties { get; set; } = new Dictionary<string, string>();
    }
}
