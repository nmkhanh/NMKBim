using System.Collections.Generic;

namespace NMKBim.Core.Models
{
    public class ModelDocument
    {
        public string Version { get; set; } = "1.0";
        public Dictionary<string, object> Metadata { get; set; } = new();
        public Dictionary<string, MaterialDefinition> Materials { get; set; } = new();
        public List<SceneObjectDefinition> Objects { get; set; } = new();
    }
}
