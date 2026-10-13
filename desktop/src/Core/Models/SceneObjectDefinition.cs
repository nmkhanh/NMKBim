using System;
using System.Collections.Generic;

namespace NMKBim.Core.Models
{
    public class SceneObjectDefinition
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string MaterialId { get; set; } = string.Empty;

        // Flat mesh buffers
        public float[] Vertices { get; set; } = Array.Empty<float>();
        public int[] Indices { get; set; } = Array.Empty<int>();
        public float[]? Normals { get; set; }

        public Dictionary<string, object> Properties { get; set; } = new();
    }
}
