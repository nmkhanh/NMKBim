namespace NMKBim.Core.Models
{
    public class PropertyItem
    {
        public string Name { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;

        public PropertyItem() { }

        public PropertyItem(string name, string value)
        {
            Name = name;
            Value = value;
        }
    }
}
