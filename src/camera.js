import { OrthographicCamera, Vector3 } from 'three';

export const MIN_ZOOM = 0.7,
  MAX_ZOOM = 4;
export function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
export function wheelZoom(current, delta) {
  return clampZoom(current * Math.exp(-Math.max(-150, Math.min(150, delta)) * 0.0018));
}

export class CameraRig {
  constructor(bounds, aspect) {
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 180);
    this.offset = new Vector3(8, 31, 34); // 41.6° elevation, fixed throughout navigation.
    this.target = bounds.getCenter(new Vector3());
    this.goal = this.target.clone();
    this.zoomGoal = 1;
    this.view = 'overview';
    this.bounds = bounds.clone();
    this.aspect = aspect;
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
    this.resize(aspect);
    this.reset(true);
  }
  fitHeight(bounds) {
    const center = bounds.getCenter(new Vector3());
    const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    let halfW = 0,
      halfH = 0;
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const corner = new Vector3(x, y, z).sub(center);
          halfW = Math.max(halfW, Math.abs(corner.dot(right)));
          halfH = Math.max(halfH, Math.abs(corner.dot(up)));
        }
    return Math.max(halfH * 2, (halfW * 2) / this.aspect) * 1.2;
  }
  resize(aspect) {
    this.aspect = Math.max(0.1, aspect);
    this.height = this.fitHeight(this.bounds);
    this.camera.left = (-this.height * this.aspect) / 2;
    this.camera.right = (this.height * this.aspect) / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.updateProjectionMatrix();
    if (this.focusBox)
      this.zoomGoal = clampZoom(this.height / (this.fitHeight(this.focusBox) * 0.8));
  }
  focus(id, bounds) {
    this.view = id;
    this.focusBox = bounds.clone();
    this.goal.copy(bounds.getCenter(new Vector3()));
    this.zoomGoal = clampZoom(this.height / (this.fitHeight(bounds) * 0.8));
  }
  reset(immediate = false) {
    this.view = 'overview';
    this.focusBox = null;
    this.goal.copy(this.bounds.getCenter(new Vector3()));
    this.zoomGoal = 1;
    if (immediate) {
      this.target.copy(this.goal);
      this.camera.zoom = 1;
      this.update(1);
    }
  }
  zoom(delta) {
    this.zoomGoal = wheelZoom(this.zoomGoal, delta);
  }
  pan(delta) {
    this.focusBox = null;
    this.goal.add(delta);
    // Keep the finite diorama recoverable even after a long drag.
    this.goal.x = Math.max(this.bounds.min.x - 5, Math.min(this.bounds.max.x + 5, this.goal.x));
    this.goal.z = Math.max(this.bounds.min.z - 8, Math.min(this.bounds.max.z + 8, this.goal.z));
  }
  update(dt) {
    const alpha = 1 - Math.exp(-dt * 10);
    this.target.lerp(this.goal, alpha);
    this.camera.zoom += (this.zoomGoal - this.camera.zoom) * alpha;
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
}
