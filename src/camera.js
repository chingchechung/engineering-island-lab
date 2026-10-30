import { OrthographicCamera, Vector3 } from 'three';

export const MIN_ZOOM = 0.7,
  MAX_ZOOM = 16;
export const DEFAULT_AZIMUTH = Math.atan2(8, 34),
  DEFAULT_ELEVATION = Math.atan2(31, Math.hypot(8, 34)),
  MIN_ELEVATION = (25 * Math.PI) / 180,
  MAX_ELEVATION = (70 * Math.PI) / 180,
  ORBIT_SPEED = 0.006;
const TAU = Math.PI * 2;

export function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
export function wheelZoom(current, delta) {
  return clampZoom(current * Math.exp(-Math.max(-150, Math.min(150, delta)) * 0.0018));
}

function corners(bounds) {
  const points = [];
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) points.push(new Vector3(x, y, z));
  return points;
}

export class CameraRig {
  constructor(bounds, aspect, framingPoints = []) {
    this.bounds = bounds.clone();
    // Orthographic projection does not depend on this distance. Keep even the
    // nearest outer island in front of the camera while orbiting a wide world.
    const diagonal = bounds.getSize(new Vector3()).length();
    this.worldDiagonal = diagonal;
    this.baseDistance = Math.max(Math.hypot(8, 31, 34), diagonal * 0.65 + 10);
    this.distance = this.baseDistance;
    this.camera = new OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0.1,
      Math.max(180, this.distance + diagonal + 40),
    );
    this.azimuth = this.azimuthGoal = DEFAULT_AZIMUTH;
    this.elevation = this.elevationGoal = DEFAULT_ELEVATION;
    this.offset = new Vector3();
    this.target = bounds.getCenter(new Vector3());
    this.goal = this.target.clone();
    this.zoomGoal = 1;
    this.manualZoom = 1;
    this.view = 'overview';
    this.aspect = Math.max(0.1, aspect);
    this.overviewPoints = framingPoints.length
      ? framingPoints.map((p) => p.clone())
      : corners(bounds);
    this.overviewCenter = this.target.clone();
    this.placeCamera();
    if (framingPoints.length) {
      const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0),
        up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      const xs = this.overviewPoints.map((p) => p.clone().sub(this.target).dot(right));
      const ys = this.overviewPoints.map((p) => p.clone().sub(this.target).dot(up));
      this.overviewCenter
        .addScaledVector(right, (Math.min(...xs) + Math.max(...xs)) / 2)
        .addScaledVector(up, (Math.min(...ys) + Math.max(...ys)) / 2);
    }
    this.resize(aspect);
    this.reset(true);
  }
  placeCamera() {
    const horizontal = Math.cos(this.elevation) * this.distance;
    this.offset.set(
      Math.sin(this.azimuth) * horizontal,
      Math.sin(this.elevation) * this.distance,
      Math.cos(this.azimuth) * horizontal,
    );
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
  fitHeight(bounds, points = null) {
    const center = points ? this.overviewCenter : bounds.getCenter(new Vector3());
    const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    let halfW = 0,
      halfH = 0;
    for (const point of points ?? corners(bounds)) {
      const relative = point.clone().sub(center);
      halfW = Math.max(halfW, Math.abs(relative.dot(right)));
      halfH = Math.max(halfH, Math.abs(relative.dot(up)));
    }
    return Math.max(halfH * 2, (halfW * 2) / this.aspect, 0.1) * 1.2;
  }
  fitProjection() {
    this.height = this.fitHeight(this.bounds, this.overviewPoints);
    this.camera.left = (-this.height * this.aspect) / 2;
    this.camera.right = (this.height * this.aspect) / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    if (this.focusBox)
      this.zoomGoal = clampZoom(
        (this.height / (this.fitHeight(this.focusBox) * 0.8)) * this.manualZoom,
      );
    this.fitDepth();
  }
  fitDepth() {
    // A portrait viewport can have corner rays whose origins lie far below
    // the camera centre. Move backwards along the same viewing axis until
    // every ray starts above the sea, including at minimum zoom/elevation.
    // This only changes depth: orthographic screen X/Y and framing stay exact.
    const halfHeight = this.height / (2 * this.camera.zoom);
    this.distance = this.baseDistance + halfHeight / Math.tan(this.elevation);
    this.camera.far = Math.max(
      180,
      this.distance + halfHeight / Math.sin(this.elevation) + this.worldDiagonal + 40,
    );
    this.placeCamera();
    this.camera.updateProjectionMatrix();
  }
  resize(aspect) {
    this.aspect = Math.max(0.1, aspect);
    this.fitProjection();
  }
  focus(id, bounds) {
    this.view = id;
    this.focusBox = bounds.clone();
    this.goal.copy(bounds.getCenter(new Vector3()));
    this.manualZoom = 1;
    this.fitProjection();
  }
  reset(immediate = false) {
    this.view = 'overview';
    this.focusBox = null;
    this.goal.copy(this.overviewCenter);
    // Return by the shortest arc even after several complete revolutions.
    this.azimuthGoal = DEFAULT_AZIMUTH + Math.round((this.azimuth - DEFAULT_AZIMUTH) / TAU) * TAU;
    this.elevationGoal = DEFAULT_ELEVATION;
    this.zoomGoal = this.manualZoom = 1;
    if (immediate) {
      this.target.copy(this.goal);
      this.azimuth = this.azimuthGoal;
      this.elevation = this.elevationGoal;
      this.camera.zoom = 1;
      this.placeCamera();
      this.fitProjection();
    }
  }
  orbit(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.azimuthGoal -= dx * ORBIT_SPEED;
    this.elevationGoal = Math.max(
      MIN_ELEVATION,
      Math.min(MAX_ELEVATION, this.elevationGoal + dy * ORBIT_SPEED),
    );
  }
  zoom(delta) {
    const next = wheelZoom(this.zoomGoal, delta);
    if (next === this.zoomGoal) return;
    this.zoomGoal = next;
    this.manualZoom = this.focusBox
      ? this.zoomGoal / (this.height / (this.fitHeight(this.focusBox) * 0.8))
      : this.zoomGoal;
  }
  pan(delta) {
    this.focusBox = null;
    this.manualZoom = this.zoomGoal;
    this.goal.add(delta);
    // Keep the finite diorama recoverable even after a long drag.
    this.goal.x = Math.max(this.bounds.min.x - 5, Math.min(this.bounds.max.x + 5, this.goal.x));
    this.goal.z = Math.max(this.bounds.min.z - 8, Math.min(this.bounds.max.z + 8, this.goal.z));
  }
  update(dt) {
    const alpha = 1 - Math.exp(-Math.max(0, dt) * 10);
    this.azimuth += (this.azimuthGoal - this.azimuth) * alpha;
    this.elevation += (this.elevationGoal - this.elevation) * alpha;
    this.target.lerp(this.goal, alpha);
    this.placeCamera();
    // Refit the actual projected island corners at every intermediate angle,
    // rather than keeping a frustum that only fits the original direction.
    this.fitProjection();
    this.camera.zoom += (this.zoomGoal - this.camera.zoom) * alpha;
    this.fitDepth();
  }
}
