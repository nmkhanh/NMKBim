import * as THREE from 'three';
import type { SceneObjectDefinition, MaterialDefinition } from '../types/model';
import type { SectionBoxState } from '../types/viewer';

/**
 * Tạo BufferGeometry siêu nhẹ trực tiếp từ mảng flat Vertices & Indices
 */
export function createGeometryFromObject(obj: SceneObjectDefinition): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const verticesFloat32 = new Float32Array(obj.vertices);
  geometry.setAttribute('position', new THREE.BufferAttribute(verticesFloat32, 3));

  if (obj.indices && obj.indices.length > 0) {
    const indicesUint32 = new Uint32Array(obj.indices);
    geometry.setIndex(new THREE.BufferAttribute(indicesUint32, 1));
  }

  if (obj.normals && obj.normals.length === obj.vertices.length) {
    const normalsFloat32 = new Float32Array(obj.normals);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normalsFloat32, 3));
  } else {
    geometry.computeVertexNormals();
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Tạo Material với clipping planes phục vụ Section Box
 */
export function createMaterial(
  matDef: MaterialDefinition | undefined,
  clippingPlanes: THREE.Plane[] = []
): THREE.MeshStandardMaterial {
  const color = matDef?.color ? new THREE.Color(matDef.color) : new THREE.Color('#94a3b8');
  const opacity = matDef?.opacity ?? 1.0;
  const roughness = matDef?.roughness ?? 0.5;
  const metalness = matDef?.metalness ?? 0.1;

  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: opacity < 1.0,
    opacity,
    side: THREE.DoubleSide,
    clippingPlanes,
    clipShadows: true,
  });
}

/**
 * Sinh ra các mặt phẳng cắt (Clipping Planes) cho Section Box
 * Hỗ trợ chế độ có chiều sâu (hasDepth = true) hoặc lát cắt tức thì phẳng (hasDepth = false)
 */
export function buildClippingPlanes(box: SectionBoxState): THREE.Plane[] {
  if (!box.enabled) return [];

  // Nếu là lát cắt tức thì (hasDepth === false), chỉ cắt tại một mặt phẳng đơn theo hướng chọn
  if (box.hasDepth === false && box.direction) {
    switch (box.direction) {
      case 'front': // Mặt phẳng cắt tại Y = box.minY, nhìn sang +Y
        return [new THREE.Plane(new THREE.Vector3(0, 1, 0), -box.minY)];
      case 'back': // Mặt phẳng cắt tại Y = box.maxY, nhìn sang -Y
        return [new THREE.Plane(new THREE.Vector3(0, -1, 0), box.maxY)];
      case 'left': // Mặt phẳng cắt tại X = box.minX, nhìn sang +X
        return [new THREE.Plane(new THREE.Vector3(1, 0, 0), -box.minX)];
      case 'right': // Mặt phẳng cắt tại X = box.maxX, nhìn sang -X
        return [new THREE.Plane(new THREE.Vector3(-1, 0, 0), box.maxX)];
    }
  }

  // Chế độ vùng sâu theo hộp 3D (6 mặt)
  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -box.minX),  // x >= minX
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), box.maxX),  // x <= maxX
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -box.minY),  // y >= minY
    new THREE.Plane(new THREE.Vector3(0, -1, 0), box.maxY),  // y <= maxY
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -box.minZ),  // z >= minZ
    new THREE.Plane(new THREE.Vector3(0, 0, -1), box.maxZ),  // z <= maxZ
  ];
}
