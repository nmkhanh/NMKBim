namespace NMKBim.Core.Models
{
    public class SectionBoxLimits
    {
        public bool IsEnabled { get; set; } = false;

        public float MinX { get; set; } = -5.0f;
        public float MaxX { get; set; } = 5.0f;

        public float MinY { get; set; } = -5.0f;
        public float MaxY { get; set; } = 5.0f;

        public float MinZ { get; set; } = -1.0f;
        public float MaxZ { get; set; } = 5.0f;
    }
}
