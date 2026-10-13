using System.Collections.Generic;
using CommunityToolkit.Mvvm.ComponentModel;

namespace NMKBim.Desktop.Models
{
    public partial class ElementGroupItem : ObservableObject
    {
        [ObservableProperty]
        private string _id = string.Empty;

        [ObservableProperty]
        private string _name = string.Empty;

        [ObservableProperty]
        private string? _color;

        public List<string> ObjectIds { get; set; } = new();

        public int Count => ObjectIds.Count;
    }
}
