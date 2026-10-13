import { create } from 'zustand';
import type { ModelDocument, SceneObjectDefinition } from '../core/types/model';
import type {
  ViewOrientation,
  GraphicMode,
  SectionBoxState,
  ViewportLayoutMode,
  ElementGroup,
  ModelBoundingBox,
  PlanDirection,
  MeasureUnit,
  MeasurementItem,
} from '../core/types/viewer';

export type AppTheme = 'dark' | 'light';
export type AppLanguage = 'en' | 'de' | 'ja';

export interface LoadedFileEntry {
  id: string;
  name: string;
  visible: boolean;
  color?: string; // Add color cho file để phân biệt bộ môn BIM
  opacity?: number; // 0.0 -> 1.0 (mặc định 1.0)
  document: ModelDocument;
}

const STORAGE_KEY = 'nmkbim_viewer_state_v2';

interface PersistentState {
  filesMeta: { id: string; name: string; visible: boolean; color?: string; opacity?: number }[];
  colorOverrides: Record<string, string>;
  elementOpacities: Record<string, number>;
  groups: ElementGroup[];
  layoutMode: ViewportLayoutMode;
  scheduleColumns: string[];
  scheduleGroupBy: string | null;
  scheduleSortBy: string | null;
  scheduleSortOrder: 'asc' | 'desc';
  theme: AppTheme;
  language: AppLanguage;
}

function loadSavedState(): Partial<PersistentState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
    return {};
  }
}

function saveState(state: Partial<PersistentState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

export interface ViewerStore {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;

  // Loading spinner
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, msg?: string) => void;

  files: LoadedFileEntry[];
  addFile: (name: string, doc: ModelDocument, color?: string) => void;
  removeFile: (id: string) => void;
  clearAllFiles: () => void;
  toggleFileVisibility: (id: string) => void;
  setFileColor: (fileId: string, color: string | null) => void;
  setFileOpacity: (fileId: string, opacity: number) => void;

  // Selection
  selectedObjectIds: string[];
  selectObject: (id: string | null, multi?: boolean) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  clearSelection: () => void;
  getSelectedObject: () => SceneObjectDefinition | null;
  getSelectedObjects: () => SceneObjectDefinition[];
  getAllVisibleObjects: () => SceneObjectDefinition[];

  // Visibility Controls (Isolate, Hide, Reset)
  hiddenObjectIds: Set<string>;
  isolatedObjectId: string | null;
  isolateObject: (id: string) => void;
  hideObject: (id: string) => void;
  resetVisibility: () => void;

  // Color & Opacity Overrides
  colorOverrides: Record<string, string>;
  setColorOverride: (objectIds: string[], color: string | null) => void;
  resetAllColorOverrides: () => void;

  elementOpacities: Record<string, number>;
  setElementOpacity: (objectIds: string[], opacity: number) => void;
  resetElementOpacity: (objectIds?: string[]) => void;

  // Groups
  groups: ElementGroup[];
  createGroup: (name: string, objectIds: string[], color?: string) => void;
  removeGroup: (groupId: string) => void;
  selectGroup: (groupId: string) => void;

  // Multi-viewport & Layout
  layoutMode: ViewportLayoutMode;
  setLayoutMode: (mode: ViewportLayoutMode) => void;

  // Schedule View configuration
  scheduleColumns: string[]; // Mặc định rỗng: chỉ show ID và Name
  setScheduleColumns: (columns: string[]) => void;
  toggleScheduleColumn: (column: string) => void;
  scheduleGroupBy: string | null;
  setScheduleGroupBy: (field: string | null) => void;
  scheduleSortBy: string | null;
  scheduleSortOrder: 'asc' | 'desc';
  setScheduleSort: (field: string | null, order?: 'asc' | 'desc') => void;

  // Zoom Extents Trigger Event
  zoomExtentsTrigger: number;
  triggerZoomExtents: () => void;

  viewMode: ViewOrientation;
  setViewMode: (mode: ViewOrientation) => void;

  // Graphic Render Mode ('shaded' | 'wireframe')
  graphicMode: GraphicMode;
  setGraphicMode: (mode: GraphicMode) => void;
  toggleGraphicMode: () => void;

  // Settings & Customization
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  selectionColor: string; // Màu của đối tượng khi được chọn (mặc định #e11d48)
  setSelectionColor: (color: string) => void;

  // Plan & Section view directions & depth
  planDirection: PlanDirection; // 'top' (từ trên xuống) hoặc 'bottom' (từ dưới lên)
  setPlanDirection: (dir: PlanDirection) => void;

  // Measurement Tool (3D, Plan, Section)
  isMeasureActive: boolean;
  measureUnit: MeasureUnit;
  measurements: MeasurementItem[];
  setMeasureActive: (active: boolean) => void;
  setMeasureUnit: (unit: MeasureUnit) => void;
  addMeasurement: (item: MeasurementItem) => void;
  clearMeasurements: () => void;

  // Dynamic Section Box & Model Bounds
  modelBounds: ModelBoundingBox;
  sectionBox: SectionBoxState;
  setSectionBox: (box: Partial<SectionBoxState>) => void;
  toggleSectionBox: () => void;
  recomputeBounds: () => void;
}

const saved = loadSavedState();

export const useViewerStore = create<ViewerStore>((set, get) => ({
  theme: saved.theme || 'dark',
  setTheme: (theme) => {
    set({ theme });
    persistStoreState();
  },

  language: saved.language || 'en',
  setLanguage: (language) => {
    set({ language });
    persistStoreState();
  },

  // Loading spinner
  isLoading: false,
  loadingMessage: 'Processing BIM Data...',
  setLoading: (isLoading, loadingMessage = 'Processing BIM Data...') => {
    set({ isLoading, loadingMessage });
  },

  files: [],
  addFile: (name, doc, color) => {
    const newEntry: LoadedFileEntry = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      visible: true,
      color: color || undefined,
      document: doc,
    };
    set((state) => {
      const nextFiles = [...state.files, newEntry];
      return { files: nextFiles };
    });
    get().recomputeBounds();
    persistStoreState();
  },

  removeFile: (id) => {
    set((state) => {
      const nextFiles = state.files.filter((f) => f.id !== id);
      return {
        files: nextFiles,
        selectedObjectIds: [],
      };
    });
    get().recomputeBounds();
    persistStoreState();
  },

  clearAllFiles: () => {
    set({
      files: [],
      selectedObjectIds: [],
      colorOverrides: {},
      groups: [],
    });
    get().recomputeBounds();
    persistStoreState();
  },

  toggleFileVisibility: (id) => {
    set((state) => {
      const nextFiles = state.files.map((f) =>
        f.id === id ? { ...f, visible: !f.visible } : f
      );
      return { files: nextFiles };
    });
    get().recomputeBounds();
    persistStoreState();
  },

  setFileColor: (fileId, color) => {
    set((state) => {
      const nextFiles = state.files.map((f) =>
        f.id === fileId ? { ...f, color: color || undefined } : f
      );
      return { files: nextFiles };
    });
    persistStoreState();
  },

  setFileOpacity: (fileId, opacity) => {
    set((state) => {
      const nextFiles = state.files.map((f) =>
        f.id === fileId ? { ...f, opacity: Math.max(0, Math.min(1, opacity)) } : f
      );
      return { files: nextFiles };
    });
    persistStoreState();
  },

  // Selection
  selectedObjectIds: [],
  selectObject: (id, multi = false) => {
    if (!id) {
      if (!multi) set({ selectedObjectIds: [] });
      return;
    }
    set((state) => {
      if (multi) {
        const exists = state.selectedObjectIds.includes(id);
        const next = exists
          ? state.selectedObjectIds.filter((x) => x !== id)
          : [...state.selectedObjectIds, id];
        return { selectedObjectIds: next };
      }
      return { selectedObjectIds: [id] };
    });
  },

  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),
  clearSelection: () => set({ selectedObjectIds: [] }),

  getSelectedObject: () => {
    const list = get().getSelectedObjects();
    return list.length > 0 ? list[0] : null;
  },

  getSelectedObjects: () => {
    const { files, selectedObjectIds, hiddenObjectIds, isolatedObjectId } = get();
    if (selectedObjectIds.length === 0) return [];

    const selectedSet = new Set(selectedObjectIds);
    const result: SceneObjectDefinition[] = [];

    for (const f of files) {
      if (f.visible) {
        for (const obj of f.document.objects) {
          if (selectedSet.has(obj.id)) {
            if (isolatedObjectId && obj.id !== isolatedObjectId) continue;
            if (hiddenObjectIds.has(obj.id)) continue;
            result.push(obj);
          }
        }
      }
    }
    return result;
  },

  getAllVisibleObjects: () => {
    const { files, hiddenObjectIds, isolatedObjectId } = get();
    const list: SceneObjectDefinition[] = [];
    for (const f of files) {
      if (f.visible) {
        for (const obj of f.document.objects) {
          if (isolatedObjectId && obj.id !== isolatedObjectId) continue;
          if (hiddenObjectIds.has(obj.id)) continue;
          list.push(obj);
        }
      }
    }
    return list;
  },

  // Visibility Controls
  hiddenObjectIds: new Set(),
  isolatedObjectId: null,

  isolateObject: (id) => {
    set({ isolatedObjectId: id });
    get().triggerZoomExtents();
  },

  hideObject: (id) => {
    set((state) => {
      const next = new Set(state.hiddenObjectIds);
      next.add(id);
      const nextSelected = state.selectedObjectIds.filter((x) => x !== id);
      return { hiddenObjectIds: next, selectedObjectIds: nextSelected };
    });
  },

  resetVisibility: () => {
    set({
      isolatedObjectId: null,
      hiddenObjectIds: new Set(),
    });
    get().triggerZoomExtents();
  },

  // Color Overrides
  colorOverrides: saved.colorOverrides || {},
  setColorOverride: (objectIds, color) => {
    set((state) => {
      const next = { ...state.colorOverrides };
      for (const id of objectIds) {
        if (color) {
          next[id] = color;
        } else {
          delete next[id];
        }
      }
      return { colorOverrides: next };
    });
    persistStoreState();
  },

  resetAllColorOverrides: () => {
    set({ colorOverrides: {} });
    persistStoreState();
  },

  elementOpacities: saved.elementOpacities || {},
  setElementOpacity: (objectIds, opacity) => {
    set((state) => {
      const next = { ...state.elementOpacities };
      const clamped = Math.max(0, Math.min(1, opacity));
      for (const id of objectIds) {
        next[id] = clamped;
      }
      return { elementOpacities: next };
    });
    persistStoreState();
  },

  resetElementOpacity: (objectIds) => {
    set((state) => {
      const next = { ...state.elementOpacities };
      if (objectIds && objectIds.length > 0) {
        for (const id of objectIds) {
          delete next[id];
        }
      } else {
        return { elementOpacities: {} };
      }
      return { elementOpacities: next };
    });
    persistStoreState();
  },

  // Groups
  groups: saved.groups || [],
  createGroup: (name, objectIds, color) => {
    if (objectIds.length === 0) return;
    const newGroup: ElementGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || `Group ${get().groups.length + 1}`,
      objectIds: [...objectIds],
      color,
    };
    set((state) => ({ groups: [...state.groups, newGroup] }));
    if (color) {
      get().setColorOverride(objectIds, color);
    }
    persistStoreState();
  },

  removeGroup: (groupId) => {
    set((state) => ({ groups: state.groups.filter((g) => g.id !== groupId) }));
    persistStoreState();
  },

  selectGroup: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (group) {
      set({ selectedObjectIds: [...group.objectIds] });
    }
  },

  // Multi-viewport & Layout
  layoutMode: saved.layoutMode || '1',
  setLayoutMode: (mode) => {
    set({ layoutMode: mode });
    persistStoreState();
  },

  // Schedule View configuration (Mặc định rỗng: chỉ show ID và Name)
  scheduleColumns: saved.scheduleColumns || [],
  setScheduleColumns: (columns) => {
    set({ scheduleColumns: columns });
    persistStoreState();
  },

  toggleScheduleColumn: (column) => {
    set((state) => {
      const exists = state.scheduleColumns.includes(column);
      const next = exists
        ? state.scheduleColumns.filter((c) => c !== column)
        : [...state.scheduleColumns, column];
      return { scheduleColumns: next };
    });
    persistStoreState();
  },

  scheduleGroupBy: saved.scheduleGroupBy || null,
  setScheduleGroupBy: (field) => {
    set({ scheduleGroupBy: field });
    persistStoreState();
  },

  scheduleSortBy: saved.scheduleSortBy || null,
  scheduleSortOrder: saved.scheduleSortOrder || 'asc',
  setScheduleSort: (field, order = 'asc') => {
    set({ scheduleSortBy: field, scheduleSortOrder: order });
    persistStoreState();
  },

  zoomExtentsTrigger: 0,
  triggerZoomExtents: () => set((state) => ({ zoomExtentsTrigger: state.zoomExtentsTrigger + 1 })),

  viewMode: '3d',
  setViewMode: (viewMode) => set({ viewMode }),

  // Settings & Customization
  isSettingsOpen: false,
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  selectionColor: '#e11d48',
  setSelectionColor: (selectionColor) => set({ selectionColor }),

  // Graphic Render Mode
  graphicMode: 'shaded',
  setGraphicMode: (graphicMode) => set({ graphicMode }),
  toggleGraphicMode: () =>
    set((state) => ({ graphicMode: state.graphicMode === 'shaded' ? 'wireframe' : 'shaded' })),

  // Plan & Section view directions & depth
  planDirection: 'top',
  setPlanDirection: (planDirection) => set({ planDirection }),

  // Measurement Tool
  isMeasureActive: false,
  measureUnit: 'm',
  measurements: [],
  setMeasureActive: (isMeasureActive) => set({ isMeasureActive }),
  setMeasureUnit: (measureUnit) => set({ measureUnit }),
  addMeasurement: (item) =>
    set((state) => ({ measurements: [...state.measurements, item] })),
  clearMeasurements: () => set({ measurements: [] }),

  modelBounds: { minX: -5, maxX: 5, minY: -5, maxY: 5, minZ: -2, maxZ: 5 },
  sectionBox: {
    enabled: false,
    minX: -5,
    maxX: 5,
    minY: -5,
    maxY: 5,
    minZ: -2,
    maxZ: 5,
    direction: 'front',
    hasDepth: true,
  },
  setSectionBox: (box) =>
    set((state) => ({ sectionBox: { ...state.sectionBox, ...box } })),
  toggleSectionBox: () =>
    set((state) => ({
      sectionBox: { ...state.sectionBox, enabled: !state.sectionBox.enabled },
    })),

  // Tự động tính toán Section Box và Model Bounds theo Bounding Box thực tế
  recomputeBounds: () => {
    const visibleObjects = get().getAllVisibleObjects();
    if (visibleObjects.length === 0) {
      const defaultB = { minX: -5, maxX: 5, minY: -5, maxY: 5, minZ: -2, maxZ: 5 };
      set({ modelBounds: defaultB, sectionBox: { ...get().sectionBox, ...defaultB } });
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const obj of visibleObjects) {
      const verts = obj.vertices;
      if (!verts) continue;
      for (let i = 0; i < verts.length; i += 3) {
        const x = verts[i];
        const y = verts[i + 1];
        const z = verts[i + 2];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    if (minX === Infinity) {
      minX = -5; maxX = 5; minY = -5; maxY = 5; minZ = -2; maxZ = 5;
    } else {
      const padX = Math.max((maxX - minX) * 0.05, 0.5);
      const padY = Math.max((maxY - minY) * 0.05, 0.5);
      const padZ = Math.max((maxZ - minZ) * 0.05, 0.5);
      minX -= padX; maxX += padX;
      minY -= padY; maxY += padY;
      minZ -= padZ; maxZ += padZ;
    }

    const bounds: ModelBoundingBox = { minX, maxX, minY, maxY, minZ, maxZ };
    set((state) => ({
      modelBounds: bounds,
      sectionBox: {
        ...state.sectionBox,
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.minY,
        maxY: bounds.maxY,
        minZ: bounds.minZ,
        maxZ: bounds.maxZ,
      },
    }));
  },
}));

function persistStoreState() {
  const s = useViewerStore.getState();
  saveState({
    filesMeta: s.files.map((f) => ({ id: f.id, name: f.name, visible: f.visible, color: f.color, opacity: f.opacity })),
    colorOverrides: s.colorOverrides,
    elementOpacities: s.elementOpacities,
    groups: s.groups,
    layoutMode: s.layoutMode,
    scheduleColumns: s.scheduleColumns,
    scheduleGroupBy: s.scheduleGroupBy,
    scheduleSortBy: s.scheduleSortBy,
    scheduleSortOrder: s.scheduleSortOrder,
    theme: s.theme,
    language: s.language,
  });
}
