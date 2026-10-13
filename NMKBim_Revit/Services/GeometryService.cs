using System;
using System.Collections.Generic;
using Autodesk.Revit.DB;
using Autodesk.Revit.DB.Structure;
using NMKBim_Revit.Models;

namespace NMKBim_Revit.Services
{
    public static class GeometryService
    {
        // 1 Foot = 0.3048 Meters (Chuẩn đơn vị SI của NMKBim)
        public const double FeetToMeters = 0.3048;

        /// <summary>
        /// Trích xuất toàn bộ lưới Solid (BimSolidMesh) từ một Element.
        /// Tự động xử lý cả cấu kiện dạng Solid (Cột, Dầm, Sàn, Tường,...) lẫn cấu kiện dạng Cốt thép (Rebar, Rebar Sets, RebarInSystem)
        /// bằng thuật toán Tube Triangulation chuẩn xác.
        /// </summary>
        public static List<BimSolidMesh> ExtractAllSolidMeshes(
            Element elem,
            Document doc,
            Options options,
            Dictionary<string, MaterialInfo> materialsDictionary)
        {
            var result = new List<BimSolidMesh>();
            if (elem == null) return result;

            long elemId = elem.Id.GetIdValue();
            string elemName = elem.Name ?? $"Element {elemId}";

            // 1. Kiểm tra nếu là Rebar (Cốt thép đơn hoặc Rebar Set)
            if (elem is Rebar rebar)
            {
                var rebarMeshes = ExtractRebarMeshes(rebar, doc, elemId, elemName, materialsDictionary);
                if (rebarMeshes.Count > 0)
                {
                    return rebarMeshes;
                }
            }

            // 2. Kiểm tra nếu là RebarInSystem (Cốt thép trong hệ thống Area / Path Reinforcement)
            if (elem is RebarInSystem rebarInSys)
            {
                var rebarSysMeshes = ExtractRebarInSystemMeshes(rebarInSys, doc, elemId, elemName, materialsDictionary);
                if (rebarSysMeshes.Count > 0)
                {
                    return rebarSysMeshes;
                }
            }

            // 3. Trích xuất Solid thông thường
            var solids = ExtractSolidsFromElement(elem, options);

            // Nếu không có solid và options ban đầu chưa gán View, thử lại với ActiveView
            if (solids.Count == 0 && options.View == null && doc.ActiveView != null)
            {
                var viewOptions = new Options
                {
                    View = doc.ActiveView,
                    ComputeReferences = false,
                    IncludeNonVisibleObjects = false
                };
                solids = ExtractSolidsFromElement(elem, viewOptions);
            }

            for (int sIndex = 0; sIndex < solids.Count; sIndex++)
            {
                var solid = solids[sIndex];
                var mesh = TriangulateSolid(solid, doc, elemId, elemName, sIndex, materialsDictionary);
                if (mesh.TriangleCount > 0)
                {
                    result.Add(mesh);
                }
            }

            // 4. Nếu vẫn không có solid, kiểm tra xem có chứa Curves không (ví dụ Cáp ứng lực, Rebar Container, Model Curve)
            if (result.Count == 0)
            {
                var curves = ExtractCurvesFromElement(elem, options);
                if (curves.Count > 0)
                {
                    // Lấy bán kính mặc định 10mm (~0.0328 ft)
                    double defaultRadiusFeet = 0.010 / FeetToMeters;
                    var tubeMesh = CreateTubeMeshFromCurves(
                        curves,
                        defaultRadiusFeet,
                        doc,
                        elemId,
                        elemName,
                        0,
                        materialsDictionary,
                        "Curve Solid Geometry"
                    );
                    if (tubeMesh.TriangleCount > 0)
                    {
                        result.Add(tubeMesh);
                    }
                }
            }

            return result;
        }

        /// <summary>
        /// Trích xuất toàn bộ Solid hợp lệ từ một Revit Element (hỗ trợ cả DirectShape, FamilyInstance, Nested Instances).
        /// </summary>
        public static List<Solid> ExtractSolidsFromElement(Element elem, Options options)
        {
            var solids = new List<Solid>();
            if (elem == null) return solids;

            GeometryElement? geomElem = null;
            try
            {
                geomElem = elem.get_Geometry(options);
            }
            catch
            {
                return solids;
            }

            if (geomElem == null) return solids;

            CollectSolidsRecursive(geomElem, solids);
            return solids;
        }

        private static void CollectSolidsRecursive(GeometryElement geomElem, List<Solid> result)
        {
            if (geomElem == null) return;

            foreach (GeometryObject geomObj in geomElem)
            {
                if (geomObj is Solid solid)
                {
                    if (solid.Faces != null && solid.Faces.Size > 0 && Math.Abs(solid.Volume) > 1e-7)
                    {
                        result.Add(solid);
                    }
                }
                else if (geomObj is GeometryInstance geomInstance)
                {
                    GeometryElement instGeom = geomInstance.GetInstanceGeometry();
                    if (instGeom != null)
                    {
                        CollectSolidsRecursive(instGeom, result);
                    }
                }
                else if (geomObj is GeometryElement nestedGeom)
                {
                    CollectSolidsRecursive(nestedGeom, result);
                }
            }
        }

        /// <summary>
        /// Trích xuất danh sách Curves từ Geometry của Element (nếu không có Solid)
        /// </summary>
        private static List<Curve> ExtractCurvesFromElement(Element elem, Options options)
        {
            var curves = new List<Curve>();
            GeometryElement? geomElem = null;
            try
            {
                geomElem = elem.get_Geometry(options);
            }
            catch
            {
                return curves;
            }

            if (geomElem == null) return curves;
            CollectCurvesRecursive(geomElem, curves);
            return curves;
        }

        private static void CollectCurvesRecursive(GeometryElement geomElem, List<Curve> curves)
        {
            if (geomElem == null) return;
            foreach (GeometryObject geomObj in geomElem)
            {
                if (geomObj is Curve curve)
                {
                    curves.Add(curve);
                }
                else if (geomObj is GeometryInstance geomInstance)
                {
                    GeometryElement instGeom = geomInstance.GetInstanceGeometry();
                    if (instGeom != null) CollectCurvesRecursive(instGeom, curves);
                }
                else if (geomObj is GeometryElement nestedGeom)
                {
                    CollectCurvesRecursive(nestedGeom, curves);
                }
            }
        }

        #region Rebar Extraction & Tube Triangulation

        /// <summary>
        /// Trích xuất toàn bộ các thanh thép trong Rebar / Rebar Set thành các BimSolidMesh dạng hình trụ tam giác
        /// </summary>
        private static List<BimSolidMesh> ExtractRebarMeshes(
            Rebar rebar,
            Document doc,
            long elemId,
            string elemName,
            Dictionary<string, MaterialInfo> materialsDictionary)
        {
            var meshes = new List<BimSolidMesh>();

            // Lấy bán kính thực tế của thanh thép từ Type hoặc Parameter
            double radiusFeet = GetRebarRadius(rebar, doc);

            int numPositions = rebar.NumberOfBarPositions;
            if (numPositions <= 0) numPositions = 1;

            for (int pos = 0; pos < numPositions; pos++)
            {
                IList<Curve>? curves = null;
                try
                {
                    curves = rebar.GetCenterlineCurves(false, false, false, MultiplanarOption.IncludeAllMultiplanarCurves, pos);
                }
                catch
                {
                    try
                    {
                        curves = rebar.GetCenterlineCurves(false, false, false, MultiplanarOption.IncludeOnlyPlanarCurves, pos);
                    }
                    catch
                    {
                        // Bỏ qua nếu vị trí này lỗi
                    }
                }

                if (curves != null && curves.Count > 0)
                {
                    string barName = numPositions > 1 ? $"{elemName} (Bar #{pos + 1})" : elemName;
                    var mesh = CreateTubeMeshFromCurves(
                        curves,
                        radiusFeet,
                        doc,
                        elemId,
                        barName,
                        pos,
                        materialsDictionary,
                        "Rebar Steel"
                    );

                    if (mesh.TriangleCount > 0)
                    {
                        mesh.Properties["Bar Set Position"] = (pos + 1).ToString();
                        mesh.Properties["Total Bars in Set"] = numPositions.ToString();
                        meshes.Add(mesh);
                    }
                }
            }

            return meshes;
        }

        /// <summary>
        /// Trích xuất toàn bộ các thanh thép trong RebarInSystem thành BimSolidMesh
        /// </summary>
        private static List<BimSolidMesh> ExtractRebarInSystemMeshes(
            RebarInSystem rebarInSys,
            Document doc,
            long elemId,
            string elemName,
            Dictionary<string, MaterialInfo> materialsDictionary)
        {
            var meshes = new List<BimSolidMesh>();
            double radiusFeet = GetRebarRadius(rebarInSys, doc);

            IList<Curve>? curves = null;
            try
            {
                curves = rebarInSys.GetCenterlineCurves(false, false, false);
            }
            catch
            {
                // Bỏ qua nếu lỗi
            }

            if (curves != null && curves.Count > 0)
            {
                var mesh = CreateTubeMeshFromCurves(
                    curves,
                    radiusFeet,
                    doc,
                    elemId,
                    elemName,
                    0,
                    materialsDictionary,
                    "Rebar Steel"
                );

                if (mesh.TriangleCount > 0)
                {
                    meshes.Add(mesh);
                }
            }

            return meshes;
        }

        private static double GetRebarRadius(Element rebarElem, Document doc)
        {
            // Mặc định: thép phi 12mm (~0.03937 feet)
            double radiusFeet = (0.012 / 2.0) / FeetToMeters;

            var typeId = rebarElem.GetTypeId();
            if (typeId != ElementId.InvalidElementId)
            {
                if (doc.GetElement(typeId) is RebarBarType barType)
                {
                    double d = barType.BarModelDiameter > 1e-6 ? barType.BarModelDiameter : barType.BarNominalDiameter;
                    if (d > 1e-6) return d / 2.0;
                }
            }

            // Thử lấy qua Parameter
            var param = rebarElem.get_Parameter(BuiltInParameter.REBAR_BAR_DIAMETER);
            if (param != null && param.HasValue && param.AsDouble() > 1e-6)
            {
                return param.AsDouble() / 2.0;
            }

            return radiusFeet;
        }

        /// <summary>
        /// Tạo lưới tam giác 3D hình trụ ống (Tube Triangulation) dọc theo chuỗi các đường cong tâm.
        /// Sử dụng kỹ thuật Parallel Transport Frame chống xoắn vặn, mang lại hình khối mịn đẹp tuyệt đối.
        /// </summary>
        public static BimSolidMesh CreateTubeMeshFromCurves(
            IList<Curve> curves,
            double radiusFeet,
            Document doc,
            long elemId,
            string elemName,
            int solidIndex,
            Dictionary<string, MaterialInfo> materialsDictionary,
            string materialLabel = "Structural Steel Rebar")
        {
            var solidMesh = new BimSolidMesh
            {
                SolidIndex = solidIndex,
                SolidId = $"{elemId}_rebar_{solidIndex}",
                Name = $"{elemName} (Solid {solidIndex + 1})"
            };

            var vertices = new List<float>();
            var indices = new List<int>();
            var normals = new List<float>();

            // Lấy danh sách điểm rời rạc của toàn bộ curve
            var points = new List<XYZ>();
            double totalLengthFeet = 0;

            foreach (var curve in curves)
            {
                if (curve == null) continue;
                totalLengthFeet += curve.Length;

                IList<XYZ> tessPoints = curve.Tessellate();
                if (tessPoints == null || tessPoints.Count == 0) continue;

                for (int i = 0; i < tessPoints.Count; i++)
                {
                    XYZ pt = tessPoints[i];
                    if (points.Count == 0 || points[points.Count - 1].DistanceTo(pt) > 1e-4)
                    {
                        points.Add(pt);
                    }
                }
            }

            if (points.Count < 2)
            {
                return solidMesh;
            }

            int segments = 8; // Số cạnh của tiết diện tròn (8 cạnh là tối ưu: nhẹ, mượt mà trên Three.js / WPF)
            double radiusMeters = radiusFeet * FeetToMeters;
            double totalLengthMeters = totalLengthFeet * FeetToMeters;

            // Xây dựng các vành đai (rings) dọc theo thân thanh thép
            var rings = new List<List<int>>();
            XYZ? prevNormalVec = null;

            for (int i = 0; i < points.Count; i++)
            {
                XYZ pt = points[i];
                XYZ tangent;

                if (i == 0)
                {
                    tangent = (points[1] - points[0]).Normalize();
                }
                else if (i == points.Count - 1)
                {
                    tangent = (points[points.Count - 1] - points[points.Count - 2]).Normalize();
                }
                else
                {
                    XYZ t1 = (points[i] - points[i - 1]).Normalize();
                    XYZ t2 = (points[i + 1] - points[i]).Normalize();
                    tangent = (t1 + t2).Normalize();
                    if (tangent.GetLength() < 1e-4) tangent = t2;
                }

                // Hệ toạ độ địa phương (Tangent, Normal, Binormal) bằng Parallel Transport
                XYZ normalVec;
                if (prevNormalVec == null)
                {
                    XYZ up = Math.Abs(tangent.Z) < 0.9 ? XYZ.BasisZ : XYZ.BasisX;
                    normalVec = tangent.CrossProduct(up).Normalize();
                }
                else
                {
                    // Chiếu normal trước lên mặt phẳng vuông góc với tiếp tuyến mới
                    normalVec = (prevNormalVec - tangent.Multiply(prevNormalVec.DotProduct(tangent))).Normalize();
                    if (normalVec.GetLength() < 1e-4)
                    {
                        XYZ up = Math.Abs(tangent.Z) < 0.9 ? XYZ.BasisZ : XYZ.BasisX;
                        normalVec = tangent.CrossProduct(up).Normalize();
                    }
                }
                prevNormalVec = normalVec;
                XYZ binormalVec = tangent.CrossProduct(normalVec).Normalize();

                // Tạo các đỉnh trên vành đai tròn
                var ringIndices = new List<int>();
                float ptX = (float)(pt.X * FeetToMeters);
                float ptY = (float)(pt.Y * FeetToMeters);
                float ptZ = (float)(pt.Z * FeetToMeters);

                for (int s = 0; s < segments; s++)
                {
                    double angle = (2.0 * Math.PI * s) / segments;
                    double cos = Math.Cos(angle);
                    double sin = Math.Sin(angle);

                    XYZ ringNormal = (normalVec.Multiply(cos) + binormalVec.Multiply(sin)).Normalize();
                    XYZ ringPt = pt + ringNormal.Multiply(radiusFeet);

                    int vertIdx = vertices.Count / 3;
                    vertices.Add((float)Math.Round(ringPt.X * FeetToMeters, 4));
                    vertices.Add((float)Math.Round(ringPt.Y * FeetToMeters, 4));
                    vertices.Add((float)Math.Round(ringPt.Z * FeetToMeters, 4));

                    normals.Add((float)Math.Round(ringNormal.X, 4));
                    normals.Add((float)Math.Round(ringNormal.Y, 4));
                    normals.Add((float)Math.Round(ringNormal.Z, 4));

                    ringIndices.Add(vertIdx);
                }

                rings.Add(ringIndices);
            }

            // Nối các mặt bên giữa từng cặp ring liên tiếp thành các tam giác
            for (int r = 0; r < rings.Count - 1; r++)
            {
                var ringA = rings[r];
                var ringB = rings[r + 1];

                for (int s = 0; s < segments; s++)
                {
                    int nextS = (s + 1) % segments;

                    int iA0 = ringA[s];
                    int iA1 = ringA[nextS];
                    int iB0 = ringB[s];
                    int iB1 = ringB[nextS];

                    // Tam giác 1
                    indices.Add(iA0);
                    indices.Add(iB0);
                    indices.Add(iB1);

                    // Tam giác 2
                    indices.Add(iA0);
                    indices.Add(iB1);
                    indices.Add(iA1);
                }
            }

            // Nắp đầu (Cap Start): Tâm đỉnh tại points[0]
            int startCenterIdx = vertices.Count / 3;
            vertices.Add((float)Math.Round(points[0].X * FeetToMeters, 4));
            vertices.Add((float)Math.Round(points[0].Y * FeetToMeters, 4));
            vertices.Add((float)Math.Round(points[0].Z * FeetToMeters, 4));
            XYZ startTangent = (points[1] - points[0]).Normalize();
            normals.Add((float)Math.Round(-startTangent.X, 4));
            normals.Add((float)Math.Round(-startTangent.Y, 4));
            normals.Add((float)Math.Round(-startTangent.Z, 4));

            for (int s = 0; s < segments; s++)
            {
                int nextS = (s + 1) % segments;
                indices.Add(startCenterIdx);
                indices.Add(rings[0][nextS]);
                indices.Add(rings[0][s]);
            }

            // Nắp đuôi (Cap End): Tâm đỉnh tại points[last]
            int lastPtIdx = points.Count - 1;
            int endCenterIdx = vertices.Count / 3;
            vertices.Add((float)Math.Round(points[lastPtIdx].X * FeetToMeters, 4));
            vertices.Add((float)Math.Round(points[lastPtIdx].Y * FeetToMeters, 4));
            vertices.Add((float)Math.Round(points[lastPtIdx].Z * FeetToMeters, 4));
            XYZ endTangent = (points[lastPtIdx] - points[lastPtIdx - 1]).Normalize();
            normals.Add((float)Math.Round(endTangent.X, 4));
            normals.Add((float)Math.Round(endTangent.Y, 4));
            normals.Add((float)Math.Round(endTangent.Z, 4));

            for (int s = 0; s < segments; s++)
            {
                int nextS = (s + 1) % segments;
                indices.Add(endCenterIdx);
                indices.Add(rings[lastPtIdx][s]);
                indices.Add(rings[lastPtIdx][nextS]);
            }

            // Vật liệu thép đặc trưng của cốt thép
            string matId = "mat_rebar_steel";
            if (!materialsDictionary.ContainsKey(matId))
            {
                materialsDictionary[matId] = new MaterialInfo
                {
                    Id = matId,
                    Name = materialLabel,
                    Color = "#38BDF8", // Xanh cyan thép nổi bật như trên Revit viewport
                    Opacity = 1.0f,
                    Roughness = 0.35f,
                    Metalness = 0.8f
                };
            }

            double volumeM3 = Math.PI * Math.Pow(radiusMeters, 2) * totalLengthMeters;
            double surfaceAreaM2 = 2.0 * Math.PI * radiusMeters * totalLengthMeters;

            solidMesh.MaterialId = matId;
            solidMesh.MaterialName = materialLabel;
            solidMesh.Vertices = vertices;
            solidMesh.Indices = indices;
            solidMesh.Normals = normals;
            solidMesh.TriangleCount = indices.Count / 3;
            solidMesh.Volume = Math.Round(volumeM3, 6);
            solidMesh.SurfaceArea = Math.Round(surfaceAreaM2, 4);

            solidMesh.Properties["Solid Type"] = "Rebar Tube Mesh";
            solidMesh.Properties["Diameter (mm)"] = Math.Round(radiusMeters * 2.0 * 1000.0, 1).ToString();
            solidMesh.Properties["Length (m)"] = Math.Round(totalLengthMeters, 3).ToString();
            solidMesh.Properties["Volume (m³)"] = solidMesh.Volume.ToString();
            solidMesh.Properties["Surface Area (m²)"] = solidMesh.SurfaceArea.ToString();
            solidMesh.Properties["Triangles"] = solidMesh.TriangleCount.ToString();

            return solidMesh;
        }

        #endregion

        /// <summary>
        /// Bóc tách một Solid thông thường thành cấu trúc lưới tam giác phẳng (Vertices & Indices)
        /// </summary>
        public static BimSolidMesh TriangulateSolid(
            Solid solid,
            Document doc,
            long elemId,
            string elemName,
            int solidIndex,
            Dictionary<string, MaterialInfo> materialsDictionary)
        {
            var solidMesh = new BimSolidMesh
            {
                SolidIndex = solidIndex,
                SolidId = $"{elemId}_solid_{solidIndex}",
                Name = $"{elemName} (Solid {solidIndex + 1})",
                Volume = Math.Round(Math.Abs(solid.Volume) * Math.Pow(FeetToMeters, 3), 4),
                SurfaceArea = Math.Round(solid.SurfaceArea * Math.Pow(FeetToMeters, 2), 4)
            };

            var vertices = new List<float>();
            var indices = new List<int>();
            var normals = new List<float>();

            var vertexMap = new Dictionary<string, int>();
            ElementId mainMaterialId = ElementId.InvalidElementId;

            foreach (Face face in solid.Faces)
            {
                if (face == null) continue;

                if (mainMaterialId == ElementId.InvalidElementId && face.MaterialElementId != ElementId.InvalidElementId)
                {
                    mainMaterialId = face.MaterialElementId;
                }

                Mesh? mesh = null;
                try
                {
                    mesh = face.Triangulate();
                }
                catch
                {
                    continue;
                }

                if (mesh == null || mesh.NumTriangles == 0) continue;

                for (int i = 0; i < mesh.NumTriangles; i++)
                {
                    MeshTriangle tri = mesh.get_Triangle(i);
                    XYZ p0 = tri.get_Vertex(0);
                    XYZ p1 = tri.get_Vertex(1);
                    XYZ p2 = tri.get_Vertex(2);

                    XYZ v01 = p1 - p0;
                    XYZ v02 = p2 - p0;
                    XYZ normal = v01.CrossProduct(v02);
                    if (normal.GetLength() > 1e-6)
                    {
                        normal = normal.Normalize();
                    }
                    else
                    {
                        normal = new XYZ(0, 0, 1);
                    }

                    int idx0 = GetOrAddVertex(p0, normal, vertices, normals, vertexMap);
                    int idx1 = GetOrAddVertex(p1, normal, vertices, normals, vertexMap);
                    int idx2 = GetOrAddVertex(p2, normal, vertices, normals, vertexMap);

                    indices.Add(idx0);
                    indices.Add(idx1);
                    indices.Add(idx2);
                }
            }

            MaterialInfo matInfo = ParameterService.CreateMaterialInfo(doc, mainMaterialId, "Default Revit Material");
            if (!materialsDictionary.ContainsKey(matInfo.Id))
            {
                materialsDictionary[matInfo.Id] = matInfo;
            }

            solidMesh.MaterialId = matInfo.Id;
            solidMesh.MaterialName = matInfo.Name;
            solidMesh.Vertices = vertices;
            solidMesh.Indices = indices;
            solidMesh.Normals = normals;
            solidMesh.TriangleCount = indices.Count / 3;

            solidMesh.Properties["Solid Index"] = (solidIndex + 1).ToString();
            solidMesh.Properties["Volume (m³)"] = solidMesh.Volume.ToString();
            solidMesh.Properties["Surface Area (m²)"] = solidMesh.SurfaceArea.ToString();
            solidMesh.Properties["Triangles"] = solidMesh.TriangleCount.ToString();
            solidMesh.Properties["Material"] = solidMesh.MaterialName;

            return solidMesh;
        }

        private static int GetOrAddVertex(
            XYZ pt,
            XYZ normal,
            List<float> vertices,
            List<float> normals,
            Dictionary<string, int> vertexMap)
        {
            float x = (float)Math.Round(pt.X * FeetToMeters, 4);
            float y = (float)Math.Round(pt.Y * FeetToMeters, 4);
            float z = (float)Math.Round(pt.Z * FeetToMeters, 4);

            string key = $"{x:F4}_{y:F4}_{z:F4}";

            if (vertexMap.TryGetValue(key, out int existingIndex))
            {
                return existingIndex;
            }

            int newIndex = vertices.Count / 3;
            vertices.Add(x);
            vertices.Add(y);
            vertices.Add(z);

            normals.Add((float)Math.Round(normal.X, 4));
            normals.Add((float)Math.Round(normal.Y, 4));
            normals.Add((float)Math.Round(normal.Z, 4));

            vertexMap[key] = newIndex;
            return newIndex;
        }
    }
}
