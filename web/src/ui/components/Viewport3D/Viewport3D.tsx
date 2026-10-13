import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ViewCubeGizmo, ObjectPosition } from '@mlightcad/three-viewcube';
import { useViewerStore } from '../../../state/viewerStore';
import { createGeometryFromObject, createMaterial, buildClippingPlanes } from '../../../core/engine/MeshBuilder';
import { t } from '../../i18n/translations';
import type { ViewOrientation } from '../../../core/types/viewer';
import styles from './Viewport3D.module.css';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetObjectId: string | null;
}

interface SelectionBoxRect {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Helper tính điểm snap chuẩn xác trên hình học (Vertex hoặc Edge/Curve) của element
function getElementSnapPoint(intersect: THREE.Intersection): [number, number, number] {
  if (!intersect.face || !intersect.object) {
    return [intersect.point.x, intersect.point.y, intersect.point.z];
  }
  const mesh = intersect.object as THREE.Mesh;
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  if (!pos) {
    return [intersect.point.x, intersect.point.y, intersect.point.z];
  }

  // 3 đỉnh của mặt tam giác theo tọa độ World
  const a = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.a).applyMatrix4(mesh.matrixWorld);
  const b = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.b).applyMatrix4(mesh.matrixWorld);
  const c = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.c).applyMatrix4(mesh.matrixWorld);

  const pt = intersect.point;
  const dA = pt.distanceTo(a);
  const dB = pt.distanceTo(b);
  const dC = pt.distanceTo(c);

  const edgeLen = Math.min(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
  const snapThreshold = Math.max(edgeLen * 0.45, 0.12);

  // 1. Ưu tiên snap vào Vertex (Đỉnh của element)
  if (dA <= dB && dA <= dC && dA < snapThreshold) return [a.x, a.y, a.z];
  if (dB <= dA && dB <= dC && dB < snapThreshold) return [b.x, b.y, b.z];
  if (dC <= dA && dC <= dB && dC < snapThreshold) return [c.x, c.y, c.z];

  // 2. Snap vào Edge / Curve (Cạnh của element)
  const lAB = new THREE.Line3(a, b);
  const lBC = new THREE.Line3(b, c);
  const lCA = new THREE.Line3(c, a);

  const pAB = new THREE.Vector3();
  const pBC = new THREE.Vector3();
  const pCA = new THREE.Vector3();

  lAB.closestPointToPoint(pt, true, pAB);
  lBC.closestPointToPoint(pt, true, pBC);
  lCA.closestPointToPoint(pt, true, pCA);

  const distAB = pt.distanceTo(pAB);
  const distBC = pt.distanceTo(pBC);
  const distCA = pt.distanceTo(pCA);

  if (distAB <= distBC && distAB <= distCA) return [pAB.x, pAB.y, pAB.z];
  if (distBC <= distAB && distBC <= distCA) return [pBC.x, pBC.y, pBC.z];
  return [pCA.x, pCA.y, pCA.z];
}

interface Viewport3DProps {
  modeOverride?: ViewOrientation;
  title?: string;
  showGizmo?: boolean;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  modeOverride,
  title,
  showGizmo = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    files,
    selectedObjectIds,
    selectObject,
    setSelectedObjectIds,
    colorOverrides,
    elementOpacities,
    hiddenObjectIds,
    isolatedObjectId,
    isolateObject,
    hideObject,
    resetVisibility,
    zoomExtentsTrigger,
    viewMode: globalViewMode,
    planDirection,
    setPlanDirection,
    sectionBox,
    setSectionBox,
    selectionColor,
    isMeasureActive,
    measureUnit,
    measurements,
    setMeasureActive,
    setMeasureUnit,
    addMeasurement,
    clearMeasurements,
    theme,
    language,
    graphicMode,
  } = useViewerStore();

  const activeMode = modeOverride || globalViewMode;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const meshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const originalMaterialsMap = useRef<Map<string, THREE.Material>>(new Map());
  const boxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const viewCubeGizmoRef = useRef<ViewCubeGizmo | null>(null);

  // Marquee Selection Box
  const [selectionBox, setSelectionBox] = useState<SelectionBoxRect>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const selectionBoxRef = useRef<SelectionBoxRect>(selectionBox);
  selectionBoxRef.current = selectionBox;

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetObjectId: null,
  });

  // Measurement Points & Helpers
  const [measureStartPoint, setMeasureStartPoint] = useState<[number, number, number] | null>(null);

  const handleMeasurementClick = (pt: [number, number, number]) => {
    if (!measureStartPoint) {
      setMeasureStartPoint(pt);
    } else {
      const p1 = new THREE.Vector3(...measureStartPoint);
      const p2 = new THREE.Vector3(...pt);
      const dist = p1.distanceTo(p2);

      addMeasurement({
        id: `meas_${Date.now()}`,
        startPoint: measureStartPoint,
        endPoint: pt,
        distance: dist,
        unit: measureUnit,
      });
      setMeasureStartPoint(null);
    }
  };

  // Tham số Orbit Control
  const controlsRef = useRef({
    target: new THREE.Vector3(0, 0, 0),
    radius: 14,
    theta: Math.PI / 4,
    phi: Math.PI / 6,
    updateCamera: () => {},
  });

  const zoomToFitVisible = () => {
    if (!cameraRef.current || !sceneRef.current) return;
    const camera = cameraRef.current;

    const bbox = new THREE.Box3();
    let hasObjects = false;

    meshesMapRef.current.forEach((mesh) => {
      if (mesh.visible) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const worldBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
          bbox.union(worldBox);
          hasObjects = true;
        }
      }
    });

    if (!hasObjects) return;

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 2);
    let distance = maxDim * 1.5;
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = camera.fov * (Math.PI / 180);
      distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.85;
    }

    controlsRef.current.target.copy(center);
    controlsRef.current.radius = Math.max(1, distance);
    controlsRef.current.updateCamera();
  };

  // Cập nhật Tâm Xoay (Pivot Target) theo các phần tử đang được chọn MÀ KHÔNG GÂY GIẬT VIEW
  useEffect(() => {
    if (selectedObjectIds.length === 0) {
      // Khi không chọn nữa: giữ nguyên tâm xoay trước đó
      return;
    }

    const selBox = new THREE.Box3();
    let hasSel = false;

    selectedObjectIds.forEach((id) => {
      const mesh = meshesMapRef.current.get(id);
      if (mesh) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const worldBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
          selBox.union(worldBox);
          hasSel = true;
        }
      }
    });

    if (hasSel && cameraRef.current) {
      const selCenter = new THREE.Vector3();
      selBox.getCenter(selCenter);
      const cam = cameraRef.current;

      // Giữ nguyên góc nhìn và khoảng cách từ camera đến tâm mới, chỉ đổi controls.target và recalculate theta, phi, radius
      const toCam = cam.position.clone().sub(selCenter);
      const newRadius = toCam.length();
      if (newRadius > 0.0001) {
        controlsRef.current.target.copy(selCenter);
        controlsRef.current.radius = newRadius;
        controlsRef.current.phi = Math.asin(Math.max(-1, Math.min(1, toCam.z / newRadius)));
        controlsRef.current.theta = Math.atan2(toCam.x, toCam.y);
      }
    }
  }, [selectedObjectIds]);

  // Lắng nghe trigger zoom extents
  useEffect(() => {
    if (zoomExtentsTrigger > 0) {
      zoomToFitVisible();
    }
  }, [zoomExtentsTrigger]);

  // Khởi tạo Three.js Scene, Renderer & ViewCube Gizmo
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Setup Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(30, 50, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight2.position.set(-30, -40, -30);
    scene.add(dirLight2);

    // Snap Indicator marker cho công cụ Đo kích thước (Measurement Dimming)
    const snapIndicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x10b981, depthTest: false })
    );
    snapIndicator.renderOrder = 9999;
    snapIndicator.visible = false;
    scene.add(snapIndicator);
    const aspect = width / height;
    // Camera chính: Khởi tạo với Orthographic khi ở chế độ Plan/Section hoặc Perspective khi ở 3D
    const isOrtho = activeMode === 'top' || activeMode === 'section';
    const frustumSize = 25;
    const camera = isOrtho
      ? new THREE.OrthographicCamera(
          (-frustumSize * aspect) / 2,
          (frustumSize * aspect) / 2,
          frustumSize / 2,
          -frustumSize / 2,
          -50000,
          50000
        )
      : new THREE.PerspectiveCamera(45, aspect, 0.001, 50000);

    camera.up.set(0, 0, 1);
    camera.position.set(12, -12, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ViewCube Gizmo với kích thước nhỏ gọn (dimension 50, fontSize 26) và trục Z là Top-Bottom
    if (showGizmo && activeMode === '3d') {
      try {
        const viewCube = new ViewCubeGizmo(camera as any, renderer, {
          pos: ObjectPosition.RIGHT_TOP,
          dimension: 50,
          faceColor: 0x334155,
          hoverColor: 0x10b981,
          outlineColor: 0x64748b,
          fontSize: 26,
        });

        // Đồng bộ trục Z là Top-Bottom
        if ((viewCube as any).cube) {
          (viewCube as any).cube.rotation.x = Math.PI / 2;
        }

        viewCube.addEventListener('change', (e: any) => {
          if (e.quaternion && cameraRef.current) {
            const cam = cameraRef.current;
            const { target, radius } = controlsRef.current;
            const rotX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
            const effQuat = e.quaternion.clone().multiply(rotX);
            const offset = new THREE.Vector3(0, 0, radius).applyQuaternion(effQuat);
            cam.position.copy(target).add(offset);
            cam.quaternion.copy(effQuat);

            const len = Math.sqrt(offset.x * offset.x + offset.y * offset.y + offset.z * offset.z);
            if (len > 0.0001) {
              controlsRef.current.phi = Math.asin(Math.max(-1, Math.min(1, offset.z / len)));
              controlsRef.current.theta = Math.atan2(offset.x, offset.y);
            }
          }
        });

        viewCubeGizmoRef.current = viewCube;
      } catch (err) {
        console.warn('ViewCube initialization:', err);
      }
    }

    const updateCameraPos = () => {
      const { target, radius, theta, phi } = controlsRef.current;
      const cam = cameraRef.current;
      if (!cam) return;

      if (activeMode === '3d') {
        cam.up.set(0, 0, 1);
        cam.position.x = target.x + radius * Math.cos(phi) * Math.sin(theta);
        cam.position.y = target.y + radius * Math.cos(phi) * Math.cos(theta);
        cam.position.z = target.z + radius * Math.sin(phi);
        cam.lookAt(target);
      } else if (activeMode === 'top') {
        // CHUẨN BIM PLAN VIEW PHẲNG THẬT (Orthographic Projection 2D)
        if (cam instanceof THREE.OrthographicCamera) {
          const w = container.clientWidth || 300;
          const h = container.clientHeight || 300;
          const asp = w / h;
          const sz = radius * 1.5;
          cam.left = (-sz * asp) / 2;
          cam.right = (sz * asp) / 2;
          cam.top = sz / 2;
          cam.bottom = -sz / 2;
          cam.updateProjectionMatrix();
        }

        const dir = useViewerStore.getState().planDirection;
        if (dir === 'bottom') {
          // Nhìn từ dưới lên (Bottom-up reflected plan)
          cam.up.set(0, -1, 0);
          cam.position.set(target.x, target.y, target.z - radius * 2);
        } else {
          // Nhìn từ trên xuống (Top-down floor plan)
          cam.up.set(0, 1, 0);
          cam.position.set(target.x, target.y, target.z + radius * 2);
        }
        cam.lookAt(target);
      } else if (activeMode === 'section') {
        // CHUẨN BIM SECTION VIEW PHẲNG THẬT (Orthographic Projection 2D từ 4 hướng của Box)
        if (cam instanceof THREE.OrthographicCamera) {
          const w = container.clientWidth || 300;
          const h = container.clientHeight || 300;
          const asp = w / h;
          const sz = radius * 1.5;
          cam.left = (-sz * asp) / 2;
          cam.right = (sz * asp) / 2;
          cam.top = sz / 2;
          cam.bottom = -sz / 2;
          cam.updateProjectionMatrix();
        }

        const secBox = useViewerStore.getState().sectionBox;
        const dir = secBox.direction || 'front';
        cam.up.set(0, 0, 1);

        switch (dir) {
          case 'front': // Chiếu từ -Y nhìn sang +Y
            cam.position.set(target.x, target.y - radius * 2, target.z);
            break;
          case 'back': // Chiếu từ +Y nhìn sang -Y
            cam.position.set(target.x, target.y + radius * 2, target.z);
            break;
          case 'left': // Chiếu từ -X nhìn sang +X
            cam.position.set(target.x - radius * 2, target.y, target.z);
            break;
          case 'right': // Chiếu từ +X nhìn sang -X
            cam.position.set(target.x + radius * 2, target.y, target.z);
            break;
        }
        cam.lookAt(target);
      }
    };
    controlsRef.current.updateCamera = updateCameraPos;
    updateCameraPos();

    // Mouse Navigation & Box Selection
    let isDragging = false;
    let isPanning = false;
    let isBoxSelecting = false;
    let prevMousePos = { x: 0, y: 0 };
    let lastMiddleClickTime = 0;

    let mouseDownPos = { x: 0, y: 0 };
    let hasDragged = false;

    const onMouseDown = (e: MouseEvent) => {
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));

      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      mouseDownPos = { x: e.clientX, y: e.clientY };
      hasDragged = false;

      if (showGizmo && activeMode === '3d' && clickX > rect.width - 80 && clickY < 80) return;

      // CHUỘT GIỮA: Pan hoặc Double Click Zoom Fit (TUYỆT ĐỐI KHÔNG ẢNH HƯỞNG SELECTION)
      if (e.button === 1) {
        const now = Date.now();
        if (now - lastMiddleClickTime < 350) {
          zoomToFitVisible();
          lastMiddleClickTime = 0;
          return;
        }
        lastMiddleClickTime = now;
        isPanning = true;
      }

      // CHUỘT TRÁI: Orbit hoặc Marquee Selection
      if (e.button === 0) {
        if (e.shiftKey) {
          isBoxSelecting = true;
          setSelectionBox({
            active: true,
            startX: clickX,
            startY: clickY,
            currentX: clickX,
            currentY: clickY,
          });
        } else {
          isDragging = true;
        }
      }

      // CHUỘT PHẢI: Pan (TUYỆT ĐỐI KHÔNG ẢNH HƯỞNG SELECTION)
      if (e.button === 2) {
        isPanning = true;
      }
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (dist > 4) {
        hasDragged = true;
      }

      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };

      if (isBoxSelecting) {
        setSelectionBox((prev) => ({
          ...prev,
          currentX: clickX,
          currentY: clickY,
        }));
        return;
      }

      if (isDragging) {
        if (activeMode === '3d') {
          controlsRef.current.theta -= dx * 0.01;
          controlsRef.current.phi = Math.max(
            -Math.PI / 2 + 0.05,
            Math.min(Math.PI / 2 - 0.05, controlsRef.current.phi + dy * 0.01)
          );
        } else {
          // Trong chế độ Plan hoặc Section, kéo chuột trái chuyển thành Pan
          const panSpeed = 0.012 * (controlsRef.current.radius / 10);
          controlsRef.current.target.x -= dx * panSpeed;
          if (activeMode === 'top') {
            controlsRef.current.target.y += dy * panSpeed;
          } else {
            controlsRef.current.target.z += dy * panSpeed;
          }
        }
        updateCameraPos();
      } else if (isPanning) {
        const panSpeed = 0.012 * (controlsRef.current.radius / 10);
        controlsRef.current.target.x -= dx * panSpeed;
        if (activeMode === 'top') {
          controlsRef.current.target.y += dy * panSpeed;
        } else {
          controlsRef.current.target.y -= dy * panSpeed;
        }
        updateCameraPos();
      }

      // Khi đang bật chế độ Đo kích thước, cập nhật điểm snap theo thời gian thực
      if (!isDragging && !isPanning && !isBoxSelecting && useViewerStore.getState().isMeasureActive && cameraRef.current) {
        mouse.x = (clickX / rect.width) * 2 - 1;
        mouse.y = -(clickY / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);
        const visibleMeshes = Array.from(meshesMapRef.current.values()).filter((m) => m.visible);
        const intersects = raycaster.intersectObjects(visibleMeshes, false);
        if (intersects.length > 0) {
          const snapPt = getElementSnapPoint(intersects[0]);
          snapIndicator.position.set(snapPt[0], snapPt[1], snapPt[2]);
          snapIndicator.visible = true;
        } else {
          snapIndicator.visible = false;
        }
      } else {
        snapIndicator.visible = false;
      }
    };

    const onMouseUp = () => {
      if (isBoxSelecting) {
        isBoxSelecting = false;
        const currentBox = selectionBoxRef.current;
        const rect = container.getBoundingClientRect();

        const xMin = Math.min(currentBox.startX, currentBox.currentX);
        const xMax = Math.max(currentBox.startX, currentBox.currentX);
        const yMin = Math.min(currentBox.startY, currentBox.currentY);
        const yMax = Math.max(currentBox.startY, currentBox.currentY);

        if (xMax - xMin > 8 && yMax - yMin > 8 && cameraRef.current) {
          const selectedInBox: string[] = [];
          const cam = cameraRef.current;

          meshesMapRef.current.forEach((mesh, id) => {
            if (!mesh.visible) return;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            if (mesh.geometry.boundingBox) {
              const center = new THREE.Vector3();
              mesh.geometry.boundingBox.getCenter(center);
              center.applyMatrix4(mesh.matrixWorld);

              const screenPos = center.clone().project(cam);
              const screenX = ((screenPos.x + 1) / 2) * rect.width;
              const screenY = ((-screenPos.y + 1) / 2) * rect.height;

              if (
                screenPos.z >= 0 &&
                screenPos.z <= 1 &&
                screenX >= xMin &&
                screenX <= xMax &&
                screenY >= yMin &&
                screenY <= yMax
              ) {
                selectedInBox.push(id);
              }
            }
          });

          if (selectedInBox.length > 0) {
            setSelectedObjectIds(selectedInBox);
          }
        }

        setSelectionBox((prev) => ({ ...prev, active: false }));
      }

      isDragging = false;
      isPanning = false;
    };

    const onWheel = (e: WheelEvent) => {
      // ZOOM KHÔNG GIỚI HẠN CHIỀU SÂU (Exponential zoom: Tỉ lệ mũ mượt mà, không bị chậm lại khi zoom sâu)
      const zoomFactor = Math.pow(0.95, e.deltaY / 50);
      controlsRef.current.radius = Math.max(
        0.0001,
        Math.min(100000, controlsRef.current.radius * zoomFactor)
      );
      updateCameraPos();
    };

    // Raycaster chọn đối tượng & Đo kích thước
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // NẾU LÀ KÉO XOAY VIEW THÌ TUYỆT ĐỐI KHÔNG ÁP DỤNG CHỌN / BỎ CHỌN
      if (hasDragged) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      if (showGizmo && activeMode === '3d' && clickX > rect.width - 50 && clickY < 50) return;

      mouse.x = (clickX / rect.width) * 2 - 1;
      mouse.y = -(clickY / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);
      const visibleMeshes = Array.from(meshesMapRef.current.values()).filter((m) => m.visible);
      const intersects = raycaster.intersectObjects(visibleMeshes, false);

      // Nếu đang bật chế độ Đo kích thước (Measurement Tool)
      const isMeasuring = useViewerStore.getState().isMeasureActive;
      if (isMeasuring && intersects.length > 0) {
        const snapPt = getElementSnapPoint(intersects[0]);
        handleMeasurementClick(snapPt);
        return;
      }

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        selectObject(hit.userData.id, e.shiftKey);
      } else if (!e.shiftKey) {
        // CHỈ KHI BẤM CHUỘT TRÁI RA NGOÀI MỚI BỎ CHỌN TẤT CẢ!
        selectObject(null, false);
      }
    };

    // Chuột phải mở Context Menu (TUYỆT ĐỐI KHÔNG BỎ CHỌN CÁC PHẦN TỬ ĐÃ CHỌN)
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      mouse.x = (clickX / rect.width) * 2 - 1;
      mouse.y = -(clickY / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);
      const visibleMeshes = Array.from(meshesMapRef.current.values()).filter((m) => m.visible);
      const intersects = raycaster.intersectObjects(visibleMeshes, false);

      let targetId: string | null = null;
      if (intersects.length > 0) {
        targetId = intersects[0].object.userData.id;
        if (targetId && !selectedObjectIds.includes(targetId)) {
          selectObject(targetId, true);
        }
      }

      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        targetObjectId: targetId || (selectedObjectIds.length > 0 ? selectedObjectIds[0] : null),
      });
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        if (viewCubeGizmoRef.current) {
          viewCubeGizmoRef.current.update();
        }
      }
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || 300;
      const h = containerRef.current.clientHeight || 300;
      const cam = cameraRef.current;
      if (cam instanceof THREE.PerspectiveCamera) {
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      } else if (cam instanceof THREE.OrthographicCamera) {
        const asp = w / h;
        const sz = controlsRef.current.radius * 1.5;
        cam.left = (-sz * asp) / 2;
        cam.right = (sz * asp) / 2;
        cam.top = sz / 2;
        cam.bottom = -sz / 2;
        cam.updateProjectionMatrix();
      }
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      if (viewCubeGizmoRef.current) {
        viewCubeGizmoRef.current.dispose();
      }
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [showGizmo, activeMode]);

  useEffect(() => {
    if (!cameraRef.current) return;
    controlsRef.current.updateCamera();
  }, [activeMode]);

  // Cập nhật Meshes từ danh sách Files + Áp dụng File Color & Color Overrides
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    meshesMapRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    meshesMapRef.current.clear();

    const planes = buildClippingPlanes(sectionBox);

    const materialCache = new Map<string, THREE.MeshStandardMaterial>();

    files.forEach((file) => {
      if (!file.visible) return;

      file.document.objects.forEach((obj) => {
        if (isolatedObjectId && obj.id !== isolatedObjectId) return;
        if (hiddenObjectIds.has(obj.id)) return;

        const geometry = createGeometryFromObject(obj);

        const fileOpacity = file.opacity ?? 1.0;
        const elemOpacity = elementOpacities[obj.id] ?? 1.0;
        const combinedOpacity = fileOpacity * elemOpacity;

        // Thứ tự ưu tiên màu: 1. Color Override của đối tượng -> 2. Màu của File -> 3. Màu gốc của Material
        const overrideColor = colorOverrides[obj.id] || file.color;
        const cacheKey = `${obj.materialId}_${overrideColor || ''}_${combinedOpacity}_${sectionBox.enabled ? 'clip' : 'noclip'}_${graphicMode}`;

        let material = materialCache.get(cacheKey);
        if (!material) {
          const matDef = file.document.materials[obj.materialId];
          material = createMaterial(matDef, planes);
          material.wireframe = graphicMode === 'wireframe';
          material.opacity = combinedOpacity;
          material.transparent = combinedOpacity < 0.999;
          if (overrideColor) {
            material.color.set(overrideColor);
          }
          materialCache.set(cacheKey, material);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { id: obj.id, materialId: obj.materialId, fileId: file.id };
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();

        scene.add(mesh);
        meshesMapRef.current.set(obj.id, mesh);
        originalMaterialsMap.current.set(obj.id, material);
      });
    });
  }, [files, hiddenObjectIds, isolatedObjectId, colorOverrides, graphicMode, elementOpacities]);

  // Cập nhật Graphic Render Mode (Shaded / Wireframe) tức thì
  useEffect(() => {
    meshesMapRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.wireframe = graphicMode === 'wireframe';
      mat.needsUpdate = true;
    });
  }, [graphicMode]);

  // Cập nhật Section Box
  useEffect(() => {
    if (!sceneRef.current) return;
    const planes = buildClippingPlanes(sectionBox);

    meshesMapRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.clippingPlanes = planes;
      mat.needsUpdate = true;
    });

    if (boxHelperRef.current) {
      sceneRef.current.remove(boxHelperRef.current);
      boxHelperRef.current = null;
    }

    if (sectionBox.enabled) {
      const box = new THREE.Box3(
        new THREE.Vector3(sectionBox.minX, sectionBox.minY, sectionBox.minZ),
        new THREE.Vector3(sectionBox.maxX, sectionBox.maxY, sectionBox.maxZ)
      );
      const helper = new THREE.Box3Helper(box, new THREE.Color('#f59e0b'));
      sceneRef.current.add(helper);
      boxHelperRef.current = helper;
    }
  }, [sectionBox]);

  // Highlight Multi-Selection với màu sắc tùy chỉnh từ Settings (selectionColor)
  useEffect(() => {
    const selectedSet = new Set(selectedObjectIds);
    meshesMapRef.current.forEach((mesh, id) => {
      const origMat = originalMaterialsMap.current.get(id) as THREE.MeshStandardMaterial;
      if (!origMat) return;

      if (selectedSet.has(id)) {
        // Clone material để áp dụng màu selectionColor độc lập cho element được chọn
        const selMat = origMat.clone();
        const highlightColor = new THREE.Color(selectionColor || '#10b981');
        selMat.color = highlightColor;
        selMat.emissive = highlightColor;
        selMat.emissiveIntensity = 0.55;
        selMat.wireframe = graphicMode === 'wireframe';
        mesh.material = selMat;
      } else {
        mesh.material = origMat;
      }
    });
  }, [selectedObjectIds, selectionColor, graphicMode]);

  const marqueeStyle: React.CSSProperties = {
    left: Math.min(selectionBox.startX, selectionBox.currentX),
    top: Math.min(selectionBox.startY, selectionBox.currentY),
    width: Math.abs(selectionBox.currentX - selectionBox.startX),
    height: Math.abs(selectionBox.currentY - selectionBox.startY),
  };

  return (
    <div
      ref={containerRef}
      className={styles.viewportContainer}
      style={{
        backgroundColor: theme === 'dark' ? '#030712' : '#e5e7eb',
      }}
    >
      {title && (
        <div className={styles.viewTitleBadge} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{title}</span>

          {/* Điều hướng trực tiếp cho Plan 2D view */}
          {activeMode === 'top' && (
            <div style={{ marginLeft: 6, pointerEvents: 'auto' }}>
              <select
                value={planDirection}
                onChange={(e) => setPlanDirection(e.target.value as any)}
                style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  color: 'var(--color-text-main)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 'var(--font-size-body)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Plan View Direction"
              >
                <option value="top">Top (Nhìn xuống)</option>
                <option value="bottom">Bottom (Nhìn lên)</option>
              </select>
            </div>
          )}

          {/* Điều hướng trực tiếp cho Section view */}
          {activeMode === 'section' && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 6, pointerEvents: 'auto' }}>
              <select
                value={sectionBox.direction || 'front'}
                onChange={(e) => setSectionBox({ direction: e.target.value as any })}
                style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  color: 'var(--color-text-main)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 'var(--font-size-body)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Section Cut Direction"
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>

              <button
                className={styles.subModeBtn}
                style={{
                  backgroundColor: sectionBox.hasDepth === false ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 'var(--font-size-body)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={() => setSectionBox({ hasDepth: !sectionBox.hasDepth })}
                title={sectionBox.hasDepth === false ? 'Lát cắt phẳng tức thì (Không chiều sâu)' : 'Theo chiều sâu Box'}
              >
                {sectionBox.hasDepth === false ? 'Lát cắt' : 'Theo Box'}
              </button>
            </div>
          )}
        </div>
      )}

      {selectionBox.active && (
        <div className={styles.selectionBoxOverlay} style={marqueeStyle} />
      )}

      {/* Context Menu Chuột Phải */}
      {contextMenu.visible && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetObjectId ? (
            <>
              <button
                className={styles.menuItem}
                onClick={() => {
                  isolateObject(contextMenu.targetObjectId!);
                  setContextMenu((c) => ({ ...c, visible: false }));
                }}
              >
                {t('menu.isolate', language)}
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  hideObject(contextMenu.targetObjectId!);
                  setContextMenu((c) => ({ ...c, visible: false }));
                }}
              >
                {t('menu.hide', language)}
              </button>
              <div className={styles.menuDivider} />
              <button
                className={styles.menuItem}
                onClick={() => {
                  const targetMesh = meshesMapRef.current.get(contextMenu.targetObjectId!);
                  if (targetMesh) {
                    if (!targetMesh.geometry.boundingBox) targetMesh.geometry.computeBoundingBox();
                    if (targetMesh.geometry.boundingBox) {
                      const box = targetMesh.geometry.boundingBox.clone().applyMatrix4(targetMesh.matrixWorld);
                      const padX = Math.max((box.max.x - box.min.x) * 0.1, 0.2);
                      const padY = Math.max((box.max.y - box.min.y) * 0.1, 0.2);
                      const padZ = Math.max((box.max.z - box.min.z) * 0.1, 0.2);

                      setSectionBox({
                        enabled: true,
                        minX: box.min.x - padX,
                        maxX: box.max.x + padX,
                        minY: box.min.y - padY,
                        maxY: box.max.y + padY,
                        minZ: box.min.z - padZ,
                        maxZ: box.max.z + padZ,
                      });
                      useViewerStore.getState().setViewMode('section');
                    }
                  }
                  setContextMenu((c) => ({ ...c, visible: false }));
                }}
              >
                ✂️ Create Section from Element Edge
              </button>
              <div className={styles.menuDivider} />
            </>
          ) : null}

          <button
            className={styles.menuItemAccent}
            onClick={() => {
              resetVisibility();
              setContextMenu((c) => ({ ...c, visible: false }));
            }}
          >
            {t('menu.reset', language)}
          </button>

          <button
            className={styles.menuItem}
            onClick={() => {
              zoomToFitVisible();
              setContextMenu((c) => ({ ...c, visible: false }));
            }}
          >
            {t('menu.zoom', language)}
          </button>
        </div>
      )}
      {/* Floating Measurement Tool Controls (Áp dụng cho cả 3 View) */}
      <div className={styles.measureToolbar}>
        <button
          className={`${styles.measureBtn} ${isMeasureActive ? styles.measureBtnActive : ''}`}
          onClick={() => {
            setMeasureActive(!isMeasureActive);
            setMeasureStartPoint(null);
          }}
          title={isMeasureActive ? 'Click elements to measure distance' : 'Activate 3D/2D Distance Measurement'}
        >
          <span>📏 Measure</span>
        </button>

        {isMeasureActive && (
          <>
            <select
              value={measureUnit}
              onChange={(e) => setMeasureUnit(e.target.value as any)}
              className={styles.measureUnitSelect}
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="inch">inch</option>
              <option value="ft">ft</option>
            </select>

            {measurements.length > 0 && (
              <button
                className={styles.measureBtn}
                onClick={clearMeasurements}
                title="Clear all measurements"
              >
                Clear ({measurements.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* Measurement Badges */}
      {measurements.map((m) => {
        let displayVal = m.distance;
        if (measureUnit === 'mm') displayVal = m.distance * 1000;
        else if (measureUnit === 'cm') displayVal = m.distance * 100;
        else if (measureUnit === 'inch') displayVal = m.distance * 39.3701;
        else if (measureUnit === 'ft') displayVal = m.distance * 3.28084;

        return (
          <div
            key={m.id}
            className={styles.measureBadge}
            style={{
              bottom: 16,
              left: 16,
            }}
          >
            📏 Distance: {displayVal.toFixed(2)} {measureUnit}
          </div>
        );
      })}

      {measureStartPoint && isMeasureActive && (
        <div
          className={styles.measureBadge}
          style={{
            bottom: 40,
            left: 16,
            borderColor: '#f59e0b',
            color: '#f59e0b',
          }}
        >
          📍 Pick 2nd point to complete measurement...
        </div>
      )}
    </div>
  );
};
