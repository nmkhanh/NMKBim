using System;
using System.Windows.Media;
using System.Windows.Media.Media3D;
using HelixToolkit.Wpf;
using NMKBim.Core.Models;

using System.Collections.Concurrent;
using System.Collections.Generic;

namespace NMKBim.Desktop.Services
{
    public interface IHelixMeshBuilder
    {
        MeshGeometry3D CreateGeometry(SceneObjectDefinition obj);
        Material CreateMaterial(MaterialDefinition? matDef, string? overrideHexColor = null, bool isSelected = false, string? selectionHighlightColor = null, double opacity = 1.0);
        GeometryModel3D CreateWireframeModel(SceneObjectDefinition obj, string? effectiveColor = null, bool isSelected = false, string? selectionHighlightColor = null, double opacity = 1.0);
    }

    public class HelixMeshBuilder : IHelixMeshBuilder
    {
        private readonly ConcurrentDictionary<string, MeshGeometry3D> _geometryCache = new();
        private readonly ConcurrentDictionary<string, Material> _materialCache = new();
        private readonly ConcurrentDictionary<string, GeometryModel3D> _wireframeCache = new();
        public MeshGeometry3D CreateGeometry(SceneObjectDefinition obj)
        {
            if (_geometryCache.TryGetValue(obj.Id, out var cachedMesh))
            {
                return cachedMesh;
            }

            var mesh = new MeshGeometry3D();

            try
            {
                if (obj.Vertices != null && obj.Vertices.Length >= 3)
                {
                    int vertexCount = obj.Vertices.Length / 3;
                    var positions = new Point3DCollection(vertexCount);
                    for (int i = 0; i + 2 < obj.Vertices.Length; i += 3)
                    {
                        positions.Add(new Point3D(obj.Vertices[i], obj.Vertices[i + 1], obj.Vertices[i + 2]));
                    }
                    mesh.Positions = positions;

                    if (obj.Indices != null && obj.Indices.Length >= 3)
                    {
                        var triangleIndices = new Int32Collection(obj.Indices.Length);
                        for (int i = 0; i < obj.Indices.Length; i++)
                        {
                            int index = obj.Indices[i];
                            if (index >= 0 && index < vertexCount)
                            {
                                triangleIndices.Add(index);
                            }
                        }
                        mesh.TriangleIndices = triangleIndices;
                    }

                    if (obj.Normals != null && obj.Normals.Length == obj.Vertices.Length)
                    {
                        var normals = new Vector3DCollection(vertexCount);
                        for (int i = 0; i + 2 < obj.Normals.Length; i += 3)
                        {
                            normals.Add(new Vector3D(obj.Normals[i], obj.Normals[i + 1], obj.Normals[i + 2]));
                        }
                        mesh.Normals = normals;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to build mesh for object {obj.Id}: {ex.Message}");
            }

            mesh.Freeze();
            _geometryCache[obj.Id] = mesh;
            return mesh;
        }

        public Material CreateMaterial(MaterialDefinition? matDef, string? overrideHexColor = null, bool isSelected = false, string? selectionHighlightColor = null, double opacity = 1.0)
        {
            string colorString = !string.IsNullOrEmpty(overrideHexColor) ? overrideHexColor : matDef?.Color ?? "#94A3B8";
            double baseOpacity = matDef?.Opacity ?? 1.0;
            double effectiveOpacity = Math.Round(Math.Clamp(baseOpacity * opacity, 0.0, 1.0), 2);
            string highlightKey = isSelected ? (selectionHighlightColor ?? "#10B981") : "none";
            string cacheKey = $"{colorString}_{effectiveOpacity}_{highlightKey}";

            if (_materialCache.TryGetValue(cacheKey, out var cachedMat))
            {
                return cachedMat;
            }

            Color color = Color.FromRgb(148, 163, 184);

            if (!string.IsNullOrEmpty(colorString))
            {
                try
                {
                    color = (Color)ColorConverter.ConvertFromString(colorString);
                }
                catch
                {
                    // keep default
                }
            }

            var brush = new SolidColorBrush(color);
            brush.Opacity = effectiveOpacity;
            brush.Freeze();

            var matGroup = new MaterialGroup();
            matGroup.Children.Add(new DiffuseMaterial(brush));
            matGroup.Children.Add(new SpecularMaterial(new SolidColorBrush(Color.FromRgb(60, 60, 60)), 30));

            // Highlight khi đối tượng được chọn (màu tùy chỉnh từ Settings)
            if (isSelected)
            {
                Color selColor = Color.FromRgb(16, 185, 129); // Default Emerald Green
                if (!string.IsNullOrEmpty(selectionHighlightColor))
                {
                    try
                    {
                        selColor = (Color)ColorConverter.ConvertFromString(selectionHighlightColor);
                    }
                    catch { }
                }
                var emissiveBrush = new SolidColorBrush(selColor);
                emissiveBrush.Freeze();
                matGroup.Children.Add(new EmissiveMaterial(emissiveBrush));
            }

            matGroup.Freeze();
            _materialCache[cacheKey] = matGroup;
            return matGroup;
        }

        public GeometryModel3D CreateWireframeModel(SceneObjectDefinition obj, string? effectiveColor = null, bool isSelected = false, string? selectionHighlightColor = null, double opacity = 1.0)
        {
            string colorKey = !string.IsNullOrEmpty(effectiveColor) ? effectiveColor : "#94A3B8";
            double effectiveOpacity = Math.Round(Math.Clamp(opacity, 0.0, 1.0), 2);
            string selKey = isSelected ? (selectionHighlightColor ?? "#10B981") : "none";
            string cacheKey = $"{obj.Id}_{colorKey}_{effectiveOpacity}_{selKey}";

            if (_wireframeCache.TryGetValue(cacheKey, out var cachedWire))
            {
                return cachedWire;
            }

            var lines = new LinesVisual3D
            {
                Thickness = 1.0
            };

            Color wireColor = Color.FromRgb(148, 163, 184);
            if (!string.IsNullOrEmpty(effectiveColor))
            {
                try
                {
                    wireColor = (Color)ColorConverter.ConvertFromString(effectiveColor);
                }
                catch { }
            }

            if (isSelected)
            {
                Color selColor = Color.FromRgb(16, 185, 129); // Default Emerald Green
                if (!string.IsNullOrEmpty(selectionHighlightColor))
                {
                    try
                    {
                        selColor = (Color)ColorConverter.ConvertFromString(selectionHighlightColor);
                    }
                    catch { }
                }
                wireColor = selColor;
                lines.Thickness = 2.0;
            }

            byte alpha = (byte)Math.Clamp((int)(255 * opacity), 0, 255);
            wireColor = Color.FromArgb(alpha, wireColor.R, wireColor.G, wireColor.B);
            lines.Color = wireColor;

            if (obj.Vertices != null && obj.Vertices.Length >= 3 && obj.Indices != null && obj.Indices.Length >= 3)
            {
                var pts = new Point3DCollection();
                int vertCount = obj.Vertices.Length / 3;

                for (int i = 0; i + 2 < obj.Indices.Length; i += 3)
                {
                    int i0 = obj.Indices[i];
                    int i1 = obj.Indices[i + 1];
                    int i2 = obj.Indices[i + 2];

                    if (i0 < vertCount && i1 < vertCount && i2 < vertCount)
                    {
                        var p0 = new Point3D(obj.Vertices[i0 * 3], obj.Vertices[i0 * 3 + 1], obj.Vertices[i0 * 3 + 2]);
                        var p1 = new Point3D(obj.Vertices[i1 * 3], obj.Vertices[i1 * 3 + 1], obj.Vertices[i1 * 3 + 2]);
                        var p2 = new Point3D(obj.Vertices[i2 * 3], obj.Vertices[i2 * 3 + 1], obj.Vertices[i2 * 3 + 2]);

                        pts.Add(p0); pts.Add(p1);
                        pts.Add(p1); pts.Add(p2);
                        pts.Add(p2); pts.Add(p0);
                    }
                }
                lines.Points = pts;
            }

            var result = (GeometryModel3D)lines.Content ?? new GeometryModel3D();
            _wireframeCache[cacheKey] = result;
            return result;
        }
    }
}
