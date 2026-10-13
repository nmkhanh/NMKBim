export type ViewOrientation = '3d' | 'top' | 'section';

export type GraphicMode = 'shaded' | 'wireframe';

export type ViewportLayoutMode = '1' | '2' | '3' | '4';

export type ViewportContentType = '3d' | 'top' | 'section' | 'schedule';

export type SectionDirection = 'front' | 'back' | 'left' | 'right';
export type PlanDirection = 'top' | 'bottom';
export type MeasureUnit = 'mm' | 'cm' | 'm' | 'inch' | 'ft';

export interface MeasurementItem {
  id: string;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  distance: number; // in meters (model native unit)
  unit: MeasureUnit;
}

export interface SectionBoxState {
  enabled: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  direction?: SectionDirection; // Hướng nhìn trích xuất của section box
  hasDepth?: boolean; // true = có chiều sâu theo box; false = lát cắt phẳng tức thì
}

export interface ElementGroup {
  id: string;
  name: string;
  objectIds: string[];
  color?: string;
}

export interface ModelBoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

