using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NMKBim_Revit.Models
{
    public class BimSolidMesh
    {
        [JsonPropertyName("solidIndex")]
        public int SolidIndex { get; set; }

        [JsonPropertyName("solidId")]
        public string SolidId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("materialId")]
        public string MaterialId { get; set; } = string.Empty;

        [JsonPropertyName("materialName")]
        public string MaterialName { get; set; } = string.Empty;

        [JsonPropertyName("volume")]
        public double Volume { get; set; }

        [JsonPropertyName("surfaceArea")]
        public double SurfaceArea { get; set; }

        [JsonPropertyName("triangleCount")]
        public int TriangleCount { get; set; }

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
