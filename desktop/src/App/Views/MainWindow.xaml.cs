using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Media3D;
using HelixToolkit.Wpf;
using NMKBim.Desktop.ViewModels;

namespace NMKBim.Desktop.Views
{
    public partial class MainWindow : Window
    {
        private Point _mouseDownPos;
        private bool _isPotentialClick = false;

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
        }

        private void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is MainViewModel vm)
            {
                vm.RequestZoomExtents += () =>
                {
                    Dispatcher.Invoke(() => viewPort.ZoomExtents());
                };

                // TÂM XOAY LINH HOẠT: Khi chọn đối tượng, tâm xoay cập nhật theo đối tượng nhưng KHÔNG giật camera
                vm.RequestPivotUpdate += (center) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        if (viewPort.Camera is ProjectionCamera cam)
                        {
                            cam.LookDirection = center - cam.Position;
                        }
                    });
                };

                // Thiết lập góc nhìn chuẩn BIM cho Top Plan và Section Cut
                vm.RequestCameraMode += (mode) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        if (viewPort.Camera is ProjectionCamera cam)
                        {
                            Point3D target = new Point3D(0, 0, 0);
                            if (vm.SelectedObject != null && vm.SelectedObject.Vertices != null && vm.SelectedObject.Vertices.Length >= 3)
                            {
                                target = new Point3D(vm.SelectedObject.Vertices[0], vm.SelectedObject.Vertices[1], vm.SelectedObject.Vertices[2]);
                            }

                            if (mode == "Top")
                            {
                                viewPort.Orthographic = true;
                                if (vm.PlanDirection == "bottom")
                                {
                                    // Nhìn từ dưới lên (Bottom-up Plan)
                                    cam.UpDirection = new Vector3D(0, 1, 0);
                                    cam.LookDirection = new Vector3D(0, 0, 30);
                                    cam.Position = new Point3D(target.X, target.Y, target.Z - 30);
                                }
                                else
                                {
                                    // Nhìn từ trên xuống (Top-down Plan)
                                    cam.UpDirection = new Vector3D(0, 1, 0);
                                    cam.LookDirection = new Vector3D(0, 0, -30);
                                    cam.Position = new Point3D(target.X, target.Y, target.Z + 30);
                                }
                            }
                            else if (mode == "Section")
                            {
                                viewPort.Orthographic = true;
                                Vector3D look;
                                Point3D pos;
                                Vector3D up = new Vector3D(0, 0, 1);

                                switch (vm.SectionDirection)
                                {
                                    case "back":
                                        look = new Vector3D(0, -30, 0);
                                        pos = new Point3D(target.X, target.Y + 30, target.Z);
                                        break;
                                    case "left":
                                        look = new Vector3D(30, 0, 0);
                                        pos = new Point3D(target.X - 30, target.Y, target.Z);
                                        break;
                                    case "right":
                                        look = new Vector3D(-30, 0, 0);
                                        pos = new Point3D(target.X + 30, target.Y, target.Z);
                                        break;
                                    case "front":
                                    default:
                                        look = new Vector3D(0, 30, 0);
                                        pos = new Point3D(target.X, target.Y - 30, target.Z);
                                        break;
                                }

                                cam.UpDirection = up;
                                cam.LookDirection = look;
                                cam.Position = pos;
                            }
                            else
                            {
                                // 3D Perspective View
                                viewPort.Orthographic = false;
                                cam.UpDirection = new Vector3D(0, 0, 1);
                                cam.LookDirection = new Vector3D(-15, 15, -12);
                                cam.Position = new Point3D(target.X + 15, target.Y - 15, target.Z + 12);
                            }
                        }
                    });
                };

                viewPort.MouseDown += ViewPort_MouseDown;
                viewPort.MouseMove += ViewPort_MouseMove;
                viewPort.MouseUp += ViewPort_MouseUp;
            }
        }

        private void ViewPort_MouseDown(object sender, MouseButtonEventArgs e)
        {
            // Nhấn đúp chuột giữa (Middle button double-click) -> Zoom vào đối tượng đang còn hiện (KHÔNG MẤT SELECTION)
            if (e.ChangedButton == MouseButton.Middle && e.ClickCount == 2)
            {
                viewPort.ZoomExtents(500);
                e.Handled = true;
                return;
            }

            // Chuột phải (ContextMenu) hoặc chuột giữa (Pan) -> KHÔNG ẢNH HƯỞNG SELECTION
            if (e.ChangedButton == MouseButton.Right || e.ChangedButton == MouseButton.Middle)
            {
                return;
            }

            if (e.ChangedButton == MouseButton.Left)
            {
                _mouseDownPos = e.GetPosition(viewPort);
                _isPotentialClick = true;
            }
        }

        private void ViewPort_MouseMove(object sender, MouseEventArgs e)
        {
            if (_isPotentialClick)
            {
                Point curPos = e.GetPosition(viewPort);
                if ((curPos - _mouseDownPos).Length > 4)
                {
                    // Người dùng đang kéo chuột để xoay / pan -> KHÔNG PHẢI CLICK CHỌN
                    _isPotentialClick = false;
                }
            }
        }

        private void ViewPort_MouseUp(object sender, MouseButtonEventArgs e)
        {
            if (e.ChangedButton != MouseButton.Left || !_isPotentialClick)
            {
                _isPotentialClick = false;
                return;
            }

            _isPotentialClick = false;
            Point mousePos = e.GetPosition(viewPort);

            if (DataContext is not MainViewModel vm) return;

            // XỬ LÝ CÔNG CỤ ĐO KHOẢNG CÁCH 3D (MEASUREMENT TOOL) VỚI BẮT ĐIỂM (VERTEX / EDGE SNAPPING)
            if (vm.IsMeasureActive)
            {
                Point3D? hitPointOpt = null;
                var hits = viewPort.Viewport.FindHits(mousePos);
                if (hits != null && hits.Count > 0 && hits[0].Model is GeometryModel3D geomModel && geomModel.Geometry is MeshGeometry3D meshHit)
                {
                    var rawPt = hits[0].Position;
                    Point3D bestSnap = rawPt;
                    double bestDist = double.MaxValue;

                    // 1. Vertex Snapping
                    int vCount = meshHit.Positions.Count;
                    for (int i = 0; i < vCount; i++)
                    {
                        var v = meshHit.Positions[i];
                        double d = (v - rawPt).Length;
                        if (d < bestDist)
                        {
                            bestDist = d;
                            bestSnap = v;
                        }
                    }

                    // 2. Edge Snapping (chiếu lên cạnh tam giác nếu không đủ gần đỉnh)
                    if (bestDist > 0.15 && meshHit.TriangleIndices != null && meshHit.TriangleIndices.Count >= 3)
                    {
                        int tCount = meshHit.TriangleIndices.Count;
                        for (int i = 0; i + 2 < tCount; i += 3)
                        {
                            int i0 = meshHit.TriangleIndices[i];
                            int i1 = meshHit.TriangleIndices[i + 1];
                            int i2 = meshHit.TriangleIndices[i + 2];
                            if (i0 < vCount && i1 < vCount && i2 < vCount)
                            {
                                var p0 = meshHit.Positions[i0];
                                var p1 = meshHit.Positions[i1];
                                var p2 = meshHit.Positions[i2];

                                Point3D[] edgePairs = { p0, p1, p1, p2, p2, p0 };
                                for (int eIdx = 0; eIdx < 6; eIdx += 2)
                                {
                                    var ea = edgePairs[eIdx];
                                    var eb = edgePairs[eIdx + 1];
                                    var ab = eb - ea;
                                    double lenSq = ab.LengthSquared;
                                    if (lenSq > 1e-6)
                                    {
                                        double t = Math.Clamp(Vector3D.DotProduct(rawPt - ea, ab) / lenSq, 0.0, 1.0);
                                        var proj = ea + t * ab;
                                        double dProj = (proj - rawPt).Length;
                                        if (dProj < bestDist)
                                        {
                                            bestDist = dProj;
                                            bestSnap = proj;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    hitPointOpt = bestSnap;
                }
                else
                {
                    hitPointOpt = viewPort.FindNearestPoint(mousePos);
                }

                if (hitPointOpt.HasValue)
                {
                    var hitPoint = hitPointOpt.Value;
                    if (vm.MeasureStartPoint == null)
                    {
                        vm.MeasureStartPoint = hitPoint;
                        vm.MeasureResultText = $"Pt 1 ({hitPoint.X:F2}, {hitPoint.Y:F2}, {hitPoint.Z:F2}) -> Pick Pt 2";
                    }
                    else
                    {
                        var p1 = vm.MeasureStartPoint.Value;
                        var p2 = hitPoint;
                        double distM = (p2 - p1).Length;

                        double converted = vm.MeasureUnit switch
                        {
                            "mm" => distM * 1000.0,
                            "cm" => distM * 100.0,
                            "inch" => distM * 39.3701,
                            "ft" => distM * 3.28084,
                            _ => distM
                        };

                        vm.MeasureResultText = $"Distance: {converted:F2} {vm.MeasureUnit}";
                        vm.MeasureStartPoint = null;
                    }
                }
                return;
            }

            // XỬ LÝ CLICK CHỌN / BỎ CHỌN ĐỐI TƯỢNG (CHỈ KHI CLICK THẬT SỰ, KHÔNG XOAY VIEW)
            var objHits = viewPort.Viewport.FindHits(mousePos);
            if (objHits != null && objHits.Count > 0)
            {
                var firstHit = objHits[0];
                if (firstHit.Model != null && vm.ModelToSceneObjectMap.TryGetValue(firstHit.Model, out var sceneObj))
                {
                    bool isShiftDown = Keyboard.IsKeyDown(Key.LeftShift) || Keyboard.IsKeyDown(Key.RightShift);
                    vm.SelectObject(sceneObj, isShiftDown);
                }
            }
            else if (!(Keyboard.IsKeyDown(Key.LeftShift) || Keyboard.IsKeyDown(Key.RightShift)))
            {
                // CHỈ KHI BẤM CHUỘT TRÁI RA NGOÀI MỚI BỎ CHỌN TẤT CẢ!
                vm.ClearSelection();
            }
        }
    }
}
