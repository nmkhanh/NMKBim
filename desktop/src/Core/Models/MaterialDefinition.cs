namespace NMKBim.Core.Models
{
    public class MaterialDefinition
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = "#808080";
        public float Opacity { get; set; } = 1.0f;
        public float Roughness { get; set; } = 0.5f;
        public float Metalness { get; set; } = 0.0f;
    }
}
