# -*- coding: utf-8 -*-
"""NMKBim - Export Data to JSON with Triangulated Solids and Parameters
Author: NMKBim Team
"""

import clr
import math
import json
import os
from datetime import datetime

# Import Revit API
clr.AddReference('RevitAPI')
clr.AddReference('RevitAPIUI')
from Autodesk.Revit.DB import (
    Options, ViewDetailLevel, Solid, GeometryInstance,
    GeometryElement, StorageType, ElementId, Group
)
from Autodesk.Revit.UI import TaskDialog
from Autodesk.Revit.UI.Selection import ObjectType

# Import WinForms for SaveFileDialog
clr.AddReference('System.Windows.Forms')
from System.Windows.Forms import SaveFileDialog, DialogResult

# Access current document
uidoc = __revit__.ActiveUIDocument
doc = uidoc.Document

FEET_TO_METERS = 0.3048

def get_param_value(param):
    if not param or not param.HasValue:
        return ""
    try:
        val_str = param.AsValueString()
        if val_str:
            return val_str.strip()
        st = param.StorageType
        if st == StorageType.String:
            return param.AsString() or ""
        elif st == StorageType.Integer:
            return str(param.AsInteger())
        elif st == StorageType.Double:
            return str(round(param.AsDouble(), 4))
        elif st == StorageType.ElementId:
            eid = param.AsElementId()
            if eid != ElementId.InvalidElementId:
                target = doc.GetElement(eid)
                return target.Name if target else str(eid.IntegerValue)
    except:
        pass
    return ""

def extract_parameters(elem):
    props = {}
    try:
        props["Element ID"] = str(elem.Id.IntegerValue)
    except:
        props["Element ID"] = str(elem.Id.Value)
    props["Unique ID"] = elem.UniqueId
    props["Name"] = elem.Name or ""
    if elem.Category:
        props["Category"] = elem.Category.Name

    # Instance parameters
    for p in elem.Parameters:
        try:
            if p and p.HasValue and p.Definition:
                pname = p.Definition.Name
                if pname and pname not in props:
                    props[pname] = get_param_value(p)
        except:
            continue

    # Type parameters
    try:
        type_id = elem.GetTypeId()
        if type_id != ElementId.InvalidElementId:
            type_elem = doc.GetElement(type_id)
            if type_elem:
                props["Type Name"] = type_elem.Name
                for tp in type_elem.Parameters:
                    if tp and tp.HasValue and tp.Definition:
                        tpname = tp.Definition.Name
                        if tpname in props:
                            props["[Type] " + tpname] = get_param_value(tp)
                        else:
                            props[tpname] = get_param_value(tp)
    except:
        pass

    return props

def collect_solids(geom_elem, result_list):
    if not geom_elem:
        return
    for geom_obj in geom_elem:
        if isinstance(geom_obj, Solid):
            if geom_obj.Faces and geom_obj.Faces.Size > 0 and abs(geom_obj.Volume) > 1e-7:
                result_list.append(geom_obj)
        elif isinstance(geom_obj, GeometryInstance):
            inst_geom = geom_obj.GetInstanceGeometry()
            if inst_geom:
                collect_solids(inst_geom, result_list)
        elif isinstance(geom_obj, GeometryElement):
            collect_solids(geom_obj, result_list)

def triangulate_solid(solid, elem_id, elem_name, solid_idx, materials_dict):
    solid_id = "{}_solid_{}".format(elem_id, solid_idx)
    vol = round(abs(solid.Volume) * (FEET_TO_METERS ** 3), 4)
    surf = round(solid.SurfaceArea * (FEET_TO_METERS ** 2), 4)

    vertices = []
    indices = []
    normals = []
    vertex_map = {}

    main_mat_id = "mat_default"

    for face in solid.Faces:
        try:
            mesh = face.Triangulate()
        except:
            continue
        if not mesh or mesh.NumTriangles == 0:
            continue

        if face.MaterialElementId != ElementId.InvalidElementId:
            try:
                mid = face.MaterialElementId.IntegerValue
            except:
                mid = face.MaterialElementId.Value
            main_mat_id = "mat_{}".format(mid)
            if main_mat_id not in materials_dict:
                mat_elem = doc.GetElement(face.MaterialElementId)
                if mat_elem:
                    col = mat_elem.Color
                    hex_col = "#{:02X}{:02X}{:02X}".format(col.Red, col.Green, col.Blue)
                    opacity = max(0.0, min(1.0, (100 - mat_elem.Transparency) / 100.0))
                    materials_dict[main_mat_id] = {
                        "id": main_mat_id,
                        "name": mat_elem.Name,
                        "color": hex_col,
                        "opacity": opacity,
                        "roughness": 0.5,
                        "metalness": 0.1
                    }

        for i in range(mesh.NumTriangles):
            tri = mesh.get_Triangle(i)
            pts = [tri.get_Vertex(0), tri.get_Vertex(1), tri.get_Vertex(2)]

            v01 = pts[1] - pts[0]
            v02 = pts[2] - pts[0]
            norm = v01.CrossProduct(v02)
            if norm.GetLength() > 1e-6:
                norm = norm.Normalize()
            else:
                norm = pts[0] # fallback

            tri_indices = []
            for p in pts:
                x = round(p.X * FEET_TO_METERS, 4)
                y = round(p.Y * FEET_TO_METERS, 4)
                z = round(p.Z * FEET_TO_METERS, 4)
                key = "{:.4f}_{:.4f}_{:.4f}".format(x, y, z)

                if key in vertex_map:
                    tri_indices.append(vertex_map[key])
                else:
                    new_idx = len(vertices) // 3
                    vertices.extend([x, y, z])
                    normals.extend([round(norm.X, 4), round(norm.Y, 4), round(norm.Z, 4)])
                    vertex_map[key] = new_idx
                    tri_indices.append(new_idx)

            indices.extend(tri_indices)

    if main_mat_id not in materials_dict:
        materials_dict[main_mat_id] = {
            "id": main_mat_id,
            "name": "Default Material",
            "color": "#94A3B8",
            "opacity": 1.0,
            "roughness": 0.5,
            "metalness": 0.0
        }

    return {
        "solidIndex": solid_idx,
        "solidId": solid_id,
        "name": "{} (Solid {})".format(elem_name, solid_idx + 1),
        "materialId": main_mat_id,
        "volume": vol,
        "surfaceArea": surf,
        "triangleCount": len(indices) // 3,
        "vertices": vertices,
        "indices": indices,
        "normals": normals,
        "properties": {
            "Solid Index": str(solid_idx + 1),
            "Volume (m³)": str(vol),
            "Surface Area (m²)": str(surf),
            "Triangles": str(len(indices) // 3)
        }
    }

def main():
    selected_ids = []
    pre_sel = uidoc.Selection.GetElementIds()
    if pre_sel and pre_sel.Count > 0:
        selected_ids.extend([eid for eid in pre_sel])
    else:
        try:
            refs = uidoc.Selection.PickObjects(
                ObjectType.Element,
                "NMKBim: Chọn các cấu kiện cần xuất dữ liệu rồi nhấn Finish"
            )
            if refs:
                selected_ids.extend([r.ElementId for r in refs])
        except:
            return

    if not selected_ids:
        TaskDialog.Show("NMKBim", "Chưa chọn phần tử nào.")
        return

    # Tự động phân rã nếu chọn trúng Group: không xuất group mà lấy toàn bộ element bên trong
    target_ids = []
    seen = set()
    queue = list(selected_ids)

    while queue:
        eid = queue.pop(0)
        if eid == ElementId.InvalidElementId:
            continue
        try:
            val_id = eid.IntegerValue
        except:
            val_id = eid.Value

        elem = doc.GetElement(eid)
        if not elem:
            continue

        if isinstance(elem, Group):
            member_ids = elem.GetMemberIds()
            if member_ids:
                for mid in member_ids:
                    queue.append(mid)
        else:
            if val_id not in seen:
                seen.add(val_id)
                target_ids.append(eid)

    if not target_ids:
        TaskDialog.Show("NMKBim", "Các đối tượng hoặc Group được chọn không chứa cấu kiện hợp lệ nào để xuất.")
        return

    # Open SaveFileDialog
    save_dialog = SaveFileDialog()
    save_dialog.Title = "NMKBim - Chọn thư mục và đặt tên file JSON"
    save_dialog.Filter = "JSON Data (*.json)|*.json|All Files (*.*)|*.*"
    save_dialog.FileName = "{}_NMKBim_{}.json".format(
        doc.Title or "Project",
        datetime.now().strftime("%Y%m%d_%H%M%S")
    )

    if save_dialog.ShowDialog() != DialogResult.OK:
        return

    export_path = save_dialog.FileName

    geom_opts = Options()
    geom_opts.ComputeReferences = False
    geom_opts.DetailLevel = ViewDetailLevel.Fine
    geom_opts.IncludeNonVisibleObjects = False

    materials = {}
    elements = []
    objects = []
    total_solids = 0
    total_triangles = 0

    for eid in target_ids:
        elem = doc.GetElement(eid)
        if not elem:
            continue

        try:
            eid_num = eid.IntegerValue
        except:
            eid_num = eid.Value

        elem_props = extract_parameters(elem)
        elem_name = elem.Name or "Element {}".format(eid_num)

        solids_raw = []
        geom = elem.get_Geometry(geom_opts)
        collect_solids(geom, solids_raw)

        element_group = {
            "elementId": eid_num,
            "uniqueId": elem.UniqueId,
            "category": elem.Category.Name if elem.Category else "Unassigned",
            "name": elem_name,
            "properties": elem_props,
            "solids": []
        }

        for s_idx, solid in enumerate(solids_raw):
            solid_mesh = triangulate_solid(solid, eid_num, elem_name, s_idx, materials)
            # Merge element properties
            for k, v in elem_props.items():
                if k not in solid_mesh["properties"]:
                    solid_mesh["properties"][k] = v

            element_group["solids"].append(solid_mesh)

            # Compatible SceneObject for NMKBim 3D Viewer
            objects.append({
                "id": solid_mesh["solidId"],
                "name": solid_mesh["name"],
                "groupId": str(eid_num),
                "groupName": elem_name,
                "materialId": solid_mesh["materialId"],
                "vertices": solid_mesh["vertices"],
                "indices": solid_mesh["indices"],
                "normals": solid_mesh["normals"],
                "properties": solid_mesh["properties"]
            })

            total_solids += 1
            total_triangles += solid_mesh["triangleCount"]

        if element_group["solids"]:
            elements.append(element_group)

    export_doc = {
        "version": "1.0",
        "metadata": {
            "name": doc.Title,
            "units": "m",
            "upAxis": "Z",
            "exportedDate": datetime.now().isoformat(),
            "author": "NMKBim pyRevit Tool",
            "totalElements": len(elements),
            "totalSolids": total_solids,
            "totalTriangles": total_triangles
        },
        "materials": materials,
        "elements": elements,
        "objects": objects
    }

    with open(export_path, "w") as f:
        json.dump(export_doc, f, indent=2, ensure_ascii=False)

    TaskDialog.Show(
        "NMKBim Revit Export",
        "Xuất thành công!\n\nElements: {}\nSolids: {}\nTriangles: {:,}\n\nĐường dẫn:\n{}".format(
            len(elements), total_solids, total_triangles, export_path
        )
    )

if __name__ == "__main__":
    main()
