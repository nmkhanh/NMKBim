export interface MaterialDefinition {
  id: string;
  name: string;
  color: string;
  opacity: number;
  roughness: number;
  metalness: number;
}

export interface SceneObjectDefinition {
  id: string;
  name: string;
  materialId: string;
  vertices: number[];
  indices: number[];
  normals?: number[];
  properties: Record<string, string>;
}

export interface ModelDocument {
  version: string;
  metadata: Record<string, string>;
  materials: Record<string, MaterialDefinition>;
  objects: SceneObjectDefinition[];
}
