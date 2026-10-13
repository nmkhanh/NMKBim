using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Windows.Media.Media3D;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Win32;
using NMKBim.Core.Enums;
using NMKBim.Core.Models;
using NMKBim.Desktop.Models;
using NMKBim.Desktop.Services;

namespace NMKBim.Desktop.ViewModels
{
    public partial class MainViewModel : ObservableObject
    {
        private readonly IModelLoaderService _modelLoader;
        private readonly IThemeService _themeService;
        private readonly ILocalizationService _localizationService;
        private readonly IHelixMeshBuilder _meshBuilder;

        [ObservableProperty]
        private ModelDocument? _document;

        // Selection
        [ObservableProperty]
        private SceneObjectDefinition? _selectedObject;

        [ObservableProperty]
        private ObservableCollection<SceneObjectDefinition> _selectedObjects = new();

        public HashSet<string> SelectedObjectIds { get; } = new();

        [ObservableProperty]
        private ObservableCollection<PropertyItem> _propertiesList = new();

        [ObservableProperty]
        private ObservableCollection<LoadedFileItem> _loadedFiles = new();

        [ObservableProperty]
        private ObservableCollection<SceneObjectDefinition> _visibleObjects = new();

        // Color Overrides (map Object ID -> Hex Color)
        public Dictionary<string, string> ColorOverrides { get; set; } = new();

        // Element Opacities (map Object ID -> double opacity [0..1])
        public Dictionary<string, double> ElementOpacities { get; set; } = new();

        [ObservableProperty]
        private double _selectedElementsOpacity = 1.0;

        // Element Groups
        [ObservableProperty]
        private ObservableCollection<ElementGroupItem> _elementGroups = new();

        // Layout Mode: "1", "2", "3", "4"
        [ObservableProperty]
        private string _layoutMode = "1";

        // Danh sách ID các đối tượng bị ẩn thủ công
        private readonly HashSet<string> _hiddenObjectIds = new();

        [ObservableProperty]
        private bool _isIsolated = false;

        private string? _isolatedObjectId = null;

        // Model3DGroup render cho HelixViewport
        [ObservableProperty]
        private Model3DGroup _realScene3DGroup = new();

        // Map giữa Model3D và SceneObjectDefinition để Hit Test
        public Dictionary<Model3D, SceneObjectDefinition> ModelToSceneObjectMap { get; } = new();

        [ObservableProperty]
        private ViewOrientation _viewOrientation = ViewOrientation.Perspective3D;

        [ObservableProperty]
        private SectionBoxLimits _sectionBox = new();

        [ObservableProperty]
        private string _currentTheme = "Dark";

        [ObservableProperty]
        private string _currentLanguage = "en";

        [ObservableProperty]
        private bool _isLoading = false;

        [ObservableProperty]
        private string _loadingMessage = "Loading BIM Data...";

        // Settings Dialog & Custom Selection Color
        [ObservableProperty]
        private bool _isSettingsOpen = false;

        [ObservableProperty]
        private string _selectionHighlightColor = "#E11D48";

        // Measurement Tool
        [ObservableProperty]
        private bool _isMeasureActive = false;

        [ObservableProperty]
        private string _measureUnit = "m";

        [ObservableProperty]
        private string _measureResultText = string.Empty;

        public bool HasMeasureResult => !string.IsNullOrEmpty(MeasureResultText);

        public Point3D? MeasureStartPoint { get; set; }

        // Schedule Filtering
        [ObservableProperty]
        private string _scheduleSearchText = string.Empty;

        [ObservableProperty]
        private ObservableCollection<SceneObjectDefinition> _filteredScheduleObjects = new();

        // 2D Flat Plan & Section orientations
        [ObservableProperty]
        private string _planDirection = "top"; // "top" or "bottom"

        [ObservableProperty]
        private string _sectionDirection = "front"; // "front", "back", "left", "right"

        [ObservableProperty]
        private bool _sectionHasDepth = true;

        // Graphic Modes: "Shaded" (default) or "Wireframe"
        [ObservableProperty]
        private string _graphicMode = "Shaded";

        public event Action? RequestZoomExtents;
        public event Action<string>? RequestCameraMode;
        public event Action<Point3D>? RequestPivotUpdate;

        public MainViewModel(
            IModelLoaderService modelLoader,
            IThemeService themeService,
            ILocalizationService localizationService,
            IHelixMeshBuilder meshBuilder)
        {
            _modelLoader = modelLoader;
            _themeService = themeService;
            _localizationService = localizationService;
            _meshBuilder = meshBuilder;

            // Tải trạng thái session trước nếu có
            RestoreSessionState();
        }

        public MainViewModel() : this(new ModelLoaderService(), new ThemeService(), new LocalizationService(), new HelixMeshBuilder())
        {
        }

        private void RestoreSessionState()
        {
            try
            {
                var state = DesktopSessionState.Load();
                LayoutMode = string.IsNullOrEmpty(state.LayoutMode) ? "1" : state.LayoutMode;
                ColorOverrides = state.ColorOverrides ?? new();

                if (state.Groups != null)
                {
                    foreach (var g in state.Groups)
                    {
                        ElementGroups.Add(new ElementGroupItem
                        {
                            Id = g.Id,
                            Name = g.Name,
                            Color = g.Color,
                            ObjectIds = g.ObjectIds ?? new()
                        });
                    }
                }

                if (state.LoadedFilePaths != null && state.LoadedFilePaths.Count > 0)
                {
                    foreach (var path in state.LoadedFilePaths)
                    {
                        if (File.Exists(path))
                        {
                            LoadFile(path, saveSession: false);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to restore session state: {ex.Message}");
            }
        }

        private void PersistSessionState()
        {
            try
            {
                var state = new DesktopSessionState
                {
                    LoadedFilePaths = LoadedFiles.Select(f => f.FilePath).ToList(),
                    ColorOverrides = new Dictionary<string, string>(ColorOverrides),
                    LayoutMode = LayoutMode,
                    Groups = ElementGroups.Select(g => new ElementGroupDto
                    {
                        Id = g.Id,
                        Name = g.Name,
                        Color = g.Color,
                        ObjectIds = g.ObjectIds
                    }).ToList()
                };
                DesktopSessionState.Save(state);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to persist session state: {ex.Message}");
            }
        }

        [RelayCommand]
        public void OpenFileDialog()
        {
            try
            {
                var openFileDialog = new OpenFileDialog
                {
                    Filter = "3D BIM JSON files (*.json)|*.json|All files (*.*)|*.*",
                    Title = "Select 3D Model File",
                    Multiselect = true
                };

                if (openFileDialog.ShowDialog() == true)
                {
                    foreach (var fileName in openFileDialog.FileNames)
                    {
                        LoadFile(fileName);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show($"Lỗi khi mở file: {ex.Message}", "NMKBim Error", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Warning);
            }
        }

        public void LoadFile(string filePath, bool saveSession = true)
        {
            try
            {
                if (!File.Exists(filePath)) return;

                // Tránh load trùng cùng file
                if (LoadedFiles.Any(f => f.FilePath.Equals(filePath, StringComparison.OrdinalIgnoreCase)))
                {
                    return;
                }

                string json = File.ReadAllText(filePath);
                var doc = _modelLoader.LoadFromJson(json);

                if (doc != null && doc.Objects != null)
                {
                    var fileItem = new LoadedFileItem
                    {
                        FileName = Path.GetFileName(filePath),
                        FilePath = filePath,
                        IsVisible = true,
                        ObjectCount = doc.Objects.Count,
                        Document = doc
                    };

                    fileItem.PropertyChanged += (s, e) =>
                    {
                        if (e.PropertyName == nameof(LoadedFileItem.IsVisible))
                        {
                            RefreshVisibleObjects();
                            RecomputeBounds();
                        }
                        else if (e.PropertyName == nameof(LoadedFileItem.ColorHex) || e.PropertyName == nameof(LoadedFileItem.Opacity))
                        {
                            RefreshVisibleObjects();
                        }
                    };

                    LoadedFiles.Add(fileItem);
                    RefreshVisibleObjects();
                    RecomputeBounds();

                    if (SelectedObjects.Count == 0 && doc.Objects.Count > 0)
                    {
                        SelectObject(doc.Objects[0], false);
                    }
                    TriggerZoomExtents();

                    if (saveSession)
                    {
                        PersistSessionState();
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load file {filePath}: {ex.Message}");
            }
        }

        [RelayCommand]
        public void RemoveFile(LoadedFileItem? fileItem)
        {
            if (fileItem == null) return;
            LoadedFiles.Remove(fileItem);
            RefreshVisibleObjects();
            RecomputeBounds();
            ClearSelection();
            PersistSessionState();
        }

        [RelayCommand]
        public void ClearAllFiles()
        {
            LoadedFiles.Clear();
            RefreshVisibleObjects();
            RecomputeBounds();
            ClearSelection();
            ColorOverrides.Clear();
            ElementGroups.Clear();
            PersistSessionState();
        }

        public void RecomputeBounds()
        {
            if (VisibleObjects.Count == 0)
            {
                SectionBox.MinX = -5f; SectionBox.MaxX = 5f;
                SectionBox.MinY = -5f; SectionBox.MaxY = 5f;
                SectionBox.MinZ = -2f; SectionBox.MaxZ = 5f;
                OnPropertyChanged(nameof(SectionBox));
                return;
            }

            double minX = double.PositiveInfinity, maxX = double.NegativeInfinity;
            double minY = double.PositiveInfinity, maxY = double.NegativeInfinity;
            double minZ = double.PositiveInfinity, maxZ = double.NegativeInfinity;

            foreach (var obj in VisibleObjects)
            {
                if (obj.Vertices == null) continue;
                for (int i = 0; i + 2 < obj.Vertices.Length; i += 3)
                {
                    double x = obj.Vertices[i];
                    double y = obj.Vertices[i + 1];
                    double z = obj.Vertices[i + 2];
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    if (z < minZ) minZ = z;
                    if (z > maxZ) maxZ = z;
                }
            }

            if (!double.IsInfinity(minX))
            {
                double padX = Math.Max((maxX - minX) * 0.05, 0.5);
                double padY = Math.Max((maxY - minY) * 0.05, 0.5);
                double padZ = Math.Max((maxZ - minZ) * 0.05, 0.5);

                SectionBox.MinX = (float)(minX - padX);
                SectionBox.MaxX = (float)(maxX + padX);
                SectionBox.MinY = (float)(minY - padY);
                SectionBox.MaxY = (float)(maxY + padY);
                SectionBox.MinZ = (float)(minZ - padZ);
                SectionBox.MaxZ = (float)(maxZ + padZ);
                OnPropertyChanged(nameof(SectionBox));
            }
        }

        public void RefreshVisibleObjects()
        {
            VisibleObjects.Clear();
            ModelToSceneObjectMap.Clear();

            var newGroup = new Model3DGroup();

            foreach (var file in LoadedFiles.Where(f => f.IsVisible && f.Document != null))
            {
                foreach (var obj in file.Document!.Objects)
                {
                    if (IsIsolated && obj.Id != _isolatedObjectId) continue;
                    if (_hiddenObjectIds.Contains(obj.Id)) continue;

                    VisibleObjects.Add(obj);

                    ColorOverrides.TryGetValue(obj.Id, out var overrideHex);
                    string? effectiveColor = !string.IsNullOrEmpty(overrideHex) ? overrideHex : file.ColorHex;
                    bool isSelected = SelectedObjectIds.Contains(obj.Id);

                    double elemOpacity = ElementOpacities.TryGetValue(obj.Id, out var eo) ? eo : 1.0;
                    double effectiveOpacity = Math.Clamp(file.Opacity * elemOpacity, 0.0, 1.0);

                    GeometryModel3D model;
                    if (GraphicMode == "Wireframe")
                    {
                        model = _meshBuilder.CreateWireframeModel(obj, effectiveColor, isSelected, SelectionHighlightColor, effectiveOpacity);
                    }
                    else
                    {
                        var geometry = _meshBuilder.CreateGeometry(obj);
                        file.Document.Materials.TryGetValue(obj.MaterialId, out var matDef);
                        var material = _meshBuilder.CreateMaterial(matDef, effectiveColor, isSelected, SelectionHighlightColor, effectiveOpacity);

                        model = new GeometryModel3D
                        {
                            Geometry = geometry,
                            Material = material,
                            BackMaterial = material
                        };
                    }

                    ModelToSceneObjectMap[model] = obj;
                    newGroup.Children.Add(model);
                }
            }

            RealScene3DGroup = newGroup;

            ApplyScheduleFilter();

            if (SelectedObject != null && !VisibleObjects.Contains(SelectedObject))
            {
                ClearSelection();
            }
        }

        partial void OnScheduleSearchTextChanged(string value)
        {
            ApplyScheduleFilter();
        }

        public void ApplyScheduleFilter()
        {
            FilteredScheduleObjects.Clear();
            var q = ScheduleSearchText?.Trim();
            foreach (var obj in VisibleObjects)
            {
                if (string.IsNullOrEmpty(q) ||
                    (obj.Id != null && obj.Id.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                    (obj.Name != null && obj.Name.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                    (obj.MaterialId != null && obj.MaterialId.Contains(q, StringComparison.OrdinalIgnoreCase)))
                {
                    FilteredScheduleObjects.Add(obj);
                }
            }
        }

        public Point3D? GetSelectionCenter()
        {
            if (SelectedObjects.Count == 0) return null;
            double sumX = 0, sumY = 0, sumZ = 0;
            int count = 0;
            foreach (var obj in SelectedObjects)
            {
                if (obj.Vertices != null && obj.Vertices.Length >= 3)
                {
                    for (int i = 0; i + 2 < obj.Vertices.Length; i += 3)
                    {
                        sumX += obj.Vertices[i];
                        sumY += obj.Vertices[i + 1];
                        sumZ += obj.Vertices[i + 2];
                        count++;
                    }
                }
            }
            if (count == 0) return null;
            return new Point3D(sumX / count, sumY / count, sumZ / count);
        }

        // ==========================================
        // MULTI-SELECTION & PROPERTY CONSOLIDATION
        // ==========================================

        public void SelectObject(SceneObjectDefinition? obj, bool multi = false)
        {
            if (obj == null)
            {
                if (!multi) ClearSelection();
                return;
            }

            if (multi)
            {
                if (SelectedObjectIds.Contains(obj.Id))
                {
                    SelectedObjectIds.Remove(obj.Id);
                    SelectedObjects.Remove(obj);
                }
                else
                {
                    SelectedObjectIds.Add(obj.Id);
                    SelectedObjects.Add(obj);
                }
            }
            else
            {
                SelectedObjectIds.Clear();
                SelectedObjects.Clear();
                SelectedObjectIds.Add(obj.Id);
                SelectedObjects.Add(obj);
            }

            SelectedObject = SelectedObjects.FirstOrDefault();
            UpdatePropertiesGrid();
            RefreshVisibleObjects(); // Cập nhật highlight đỏ

            var center = GetSelectionCenter();
            if (center.HasValue)
            {
                RequestPivotUpdate?.Invoke(center.Value);
            }
        }

        public void ClearSelection()
        {
            SelectedObjectIds.Clear();
            SelectedObjects.Clear();
            SelectedObject = null;
            PropertiesList.Clear();
            RefreshVisibleObjects();
        }

        private void UpdatePropertiesGrid()
        {
            PropertiesList.Clear();
            if (SelectedObjects.Count == 0) return;

            if (SelectedObjects.Count == 1)
            {
                var single = SelectedObjects[0];
                foreach (var kv in single.Properties)
                {
                    PropertiesList.Add(new PropertyItem(kv.Key, kv.Value?.ToString() ?? string.Empty));
                }
                return;
            }

            // Consolidated properties ("varies")
            var allKeys = new HashSet<string>();
            foreach (var obj in SelectedObjects)
            {
                foreach (var k in obj.Properties.Keys)
                {
                    allKeys.Add(k);
                }
            }

            foreach (var key in allKeys.OrderBy(k => k))
            {
                SelectedObjects[0].Properties.TryGetValue(key, out var firstVal);
                bool isSame = true;

                for (int i = 1; i < SelectedObjects.Count; i++)
                {
                    SelectedObjects[i].Properties.TryGetValue(key, out var val);
                    if (!Equals(val, firstVal))
                    {
                        isSame = false;
                        break;
                    }
                }

                if (isSame && firstVal != null)
                {
                    PropertiesList.Add(new PropertyItem(key, firstVal.ToString() ?? string.Empty));
                }
                else
                {
                    PropertiesList.Add(new PropertyItem(key, "varies"));
                }
            }
        }

        // ==========================================
        // COLOR OVERRIDES & GROUPS
        // ==========================================

        [RelayCommand]
        public void SetColorOverride(string hexColor)
        {
            if (SelectedObjectIds.Count == 0) return;
            foreach (var id in SelectedObjectIds)
            {
                ColorOverrides[id] = hexColor;
            }
            RefreshVisibleObjects();
            PersistSessionState();
        }

        [RelayCommand]
        public void ResetColorOverride()
        {
            if (SelectedObjectIds.Count == 0) return;
            foreach (var id in SelectedObjectIds)
            {
                ColorOverrides.Remove(id);
            }
            RefreshVisibleObjects();
            PersistSessionState();
        }

        partial void OnSelectedElementsOpacityChanged(double value)
        {
            if (SelectedObjectIds.Count == 0) return;
            foreach (var id in SelectedObjectIds)
            {
                ElementOpacities[id] = value;
            }
            RefreshVisibleObjects();
        }

        [RelayCommand]
        public void SetElementOpacity(double opacity)
        {
            if (SelectedObjectIds.Count == 0) return;
            SelectedElementsOpacity = opacity;
        }

        [RelayCommand]
        public void ResetElementOpacity()
        {
            if (SelectedObjectIds.Count == 0) return;
            foreach (var id in SelectedObjectIds)
            {
                ElementOpacities.Remove(id);
            }
            SelectedElementsOpacity = 1.0;
            RefreshVisibleObjects();
        }

        [RelayCommand]
        public void CreateGroup(string name)
        {
            if (SelectedObjectIds.Count == 0) return;
            var group = new ElementGroupItem
            {
                Id = $"grp_{DateTime.Now.Ticks}",
                Name = string.IsNullOrWhiteSpace(name) ? $"Group {ElementGroups.Count + 1}" : name,
                ObjectIds = SelectedObjectIds.ToList()
            };
            ElementGroups.Add(group);
            PersistSessionState();
        }

        [RelayCommand]
        public void RemoveGroup(ElementGroupItem? group)
        {
            if (group == null) return;
            ElementGroups.Remove(group);
            PersistSessionState();
        }

        [RelayCommand]
        public void SelectGroup(ElementGroupItem? group)
        {
            if (group == null) return;
            SelectedObjectIds.Clear();
            SelectedObjects.Clear();

            foreach (var id in group.ObjectIds)
            {
                var found = VisibleObjects.FirstOrDefault(o => o.Id == id);
                if (found != null)
                {
                    SelectedObjectIds.Add(id);
                    SelectedObjects.Add(found);
                }
            }

            SelectedObject = SelectedObjects.FirstOrDefault();
            UpdatePropertiesGrid();
            RefreshVisibleObjects();
        }

        // ==========================================
        // LAYOUT MODES & CONTEXT MENU
        // ==========================================

        [RelayCommand]
        public void SetLayoutMode(string mode)
        {
            LayoutMode = mode;
            PersistSessionState();
        }

        [RelayCommand]
        public void IsolateSelected()
        {
            if (SelectedObject != null)
            {
                IsIsolated = true;
                _isolatedObjectId = SelectedObject.Id;
                RefreshVisibleObjects();
                TriggerZoomExtents();
            }
        }

        [RelayCommand]
        public void HideSelected()
        {
            if (SelectedObjects.Count > 0)
            {
                foreach (var obj in SelectedObjects)
                {
                    _hiddenObjectIds.Add(obj.Id);
                }
                ClearSelection();
                RefreshVisibleObjects();
            }
        }

        [RelayCommand]
        public void CreateSectionFromSelected()
        {
            if (SelectedObjects.Count == 0) return;

            double minX = double.PositiveInfinity, maxX = double.NegativeInfinity;
            double minY = double.PositiveInfinity, maxY = double.NegativeInfinity;
            double minZ = double.PositiveInfinity, maxZ = double.NegativeInfinity;

            foreach (var obj in SelectedObjects)
            {
                if (obj.Vertices == null) continue;
                for (int i = 0; i + 2 < obj.Vertices.Length; i += 3)
                {
                    double x = obj.Vertices[i];
                    double y = obj.Vertices[i + 1];
                    double z = obj.Vertices[i + 2];
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    if (z < minZ) minZ = z;
                    if (z > maxZ) maxZ = z;
                }
            }

            if (!double.IsInfinity(minX))
            {
                double padX = Math.Max((maxX - minX) * 0.1, 0.2);
                double padY = Math.Max((maxY - minY) * 0.1, 0.2);
                double padZ = Math.Max((maxZ - minZ) * 0.1, 0.2);

                SectionBox.MinX = (float)(minX - padX);
                SectionBox.MaxX = (float)(maxX + padX);
                SectionBox.MinY = (float)(minY - padY);
                SectionBox.MaxY = (float)(maxY + padY);
                SectionBox.MinZ = (float)(minZ - padZ);
                SectionBox.MaxZ = (float)(maxZ + padZ);
                SectionBox.IsEnabled = true;
                OnPropertyChanged(nameof(SectionBox));

                SetViewMode("Section");
            }
        }

        [RelayCommand]
        public void ResetVisibility()
        {
            IsIsolated = false;
            _isolatedObjectId = null;
            _hiddenObjectIds.Clear();
            RefreshVisibleObjects();
            TriggerZoomExtents();
        }

        public void TriggerZoomExtents()
        {
            RequestZoomExtents?.Invoke();
        }

        [RelayCommand]
        public void SetViewMode(string mode)
        {
            ViewOrientation = mode switch
            {
                "Top" => ViewOrientation.TopPlan,
                "Section" => ViewOrientation.SectionCut,
                _ => ViewOrientation.Perspective3D
            };
            RequestCameraMode?.Invoke(mode);
        }

        [RelayCommand]
        public void ToggleSectionBox()
        {
            SectionBox.IsEnabled = !SectionBox.IsEnabled;
            OnPropertyChanged(nameof(SectionBox));
        }

        [RelayCommand]
        public void ToggleTheme()
        {
            _themeService.ToggleTheme();
            CurrentTheme = _themeService.CurrentTheme;
        }

        [RelayCommand]
        public void ChangeLanguage(string lang)
        {
            _localizationService.SetLanguage(lang);
            CurrentLanguage = lang;
        }

        [RelayCommand]
        public void ToggleSettings()
        {
            IsSettingsOpen = !IsSettingsOpen;
        }

        [RelayCommand]
        public void SetSelectionHighlightColor(string hex)
        {
            SelectionHighlightColor = hex;
            RefreshVisibleObjects();
        }

        [RelayCommand]
        public void ToggleMeasure()
        {
            IsMeasureActive = !IsMeasureActive;
            MeasureStartPoint = null;
            if (!IsMeasureActive)
            {
                MeasureResultText = string.Empty;
            }
        }

        [RelayCommand]
        public void ClearMeasure()
        {
            MeasureStartPoint = null;
            MeasureResultText = string.Empty;
            OnPropertyChanged(nameof(HasMeasureResult));
        }

        [RelayCommand]
        public void SelectAllFiltered()
        {
            foreach (var obj in FilteredScheduleObjects)
            {
                SelectedObjectIds.Add(obj.Id);
                if (!SelectedObjects.Contains(obj))
                {
                    SelectedObjects.Add(obj);
                }
            }
            SelectedObject = SelectedObjects.FirstOrDefault();
            UpdatePropertiesGrid();
            RefreshVisibleObjects();
        }

        [RelayCommand]
        public void DeselectAllFiltered()
        {
            ClearSelection();
        }

        [RelayCommand]
        public void SetPlanDirection(string dir)
        {
            PlanDirection = dir;
            RequestCameraMode?.Invoke("Top");
        }

        [RelayCommand]
        public void SetSectionDirection(string dir)
        {
            SectionDirection = dir;
            RequestCameraMode?.Invoke("Section");
        }

        [RelayCommand]
        public void ToggleSectionDepth()
        {
            SectionHasDepth = !SectionHasDepth;
            RequestCameraMode?.Invoke("Section");
        }

        [RelayCommand]
        public void ToggleGraphicMode()
        {
            GraphicMode = GraphicMode == "Shaded" ? "Wireframe" : "Shaded";
            RefreshVisibleObjects();
        }

        [RelayCommand]
        public void SetGraphicMode(string mode)
        {
            GraphicMode = mode;
            RefreshVisibleObjects();
        }
    }
}
