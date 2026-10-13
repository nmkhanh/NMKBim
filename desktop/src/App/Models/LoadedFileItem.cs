using CommunityToolkit.Mvvm.ComponentModel;
using NMKBim.Core.Models;

namespace NMKBim.Desktop.Models
{
    public partial class LoadedFileItem : ObservableObject
    {
        [ObservableProperty]
        private string _fileName = string.Empty;

        [ObservableProperty]
        private string _filePath = string.Empty;

        [ObservableProperty]
        private bool _isVisible = true;

        [ObservableProperty]
        private string? _colorHex;

        [ObservableProperty]
        private double _opacity = 1.0;

        [ObservableProperty]
        private int _objectCount = 0;

        public ModelDocument? Document { get; set; }
    }
}
