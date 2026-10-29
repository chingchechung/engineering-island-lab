import { Plane, Raycaster, Vector2, Vector3 } from 'three';
export const DRAG_THRESHOLD = 6;
export class PointerGesture {
  begin(x, y) {
    this.origin = { x, y };
    this.maxDistance = 0;
    this.cancelled = false;
  }
  move(x, y) {
    if (this.origin)
      this.maxDistance = Math.max(
        this.maxDistance,
        Math.hypot(x - this.origin.x, y - this.origin.y),
      );
  }
  cancel() {
    this.cancelled = true;
    this.origin = null;
  }
  end(x, y) {
    this.move(x, y);
    const click = Boolean(this.origin) && !this.cancelled && this.maxDistance < DRAG_THRESHOLD;
    this.origin = null;
    return click;
  }
  get dragging() {
    return Boolean(this.origin) && this.maxDistance >= DRAG_THRESHOLD;
  }
}

export function attachInteraction({ canvas, rig, getPickables, blocked, onAction, onHover }) {
  const ray = new Raycaster(),
    pointer = new Vector2(),
    plane = new Plane(new Vector3(0, 1, 0), 0);
  const gesture = new PointerGesture();
  let active = null,
    last = null;
  const setRay = (x, y) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((x - rect.left) / rect.width) * 2 - 1, (-(y - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, rig.camera);
  };
  const groundPoint = (x, y) => {
    setRay(x, y);
    return ray.ray.intersectPlane(plane, new Vector3());
  };
  const pick = (x, y) => {
    setRay(x, y);
    return ray.intersectObjects(getPickables(), false)[0]?.object.userData.action ?? null;
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (active !== null) {
      gesture.cancel();
      last = null;
      return;
    }
    if (blocked() || ![0, 2].includes(event.button)) return;
    active = event.pointerId;
    gesture.begin(event.clientX, event.clientY);
    last = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    if (event.button === 2) gesture.maxDistance = DRAG_THRESHOLD;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (blocked()) {
      gesture.cancel();
      return;
    }
    if (active === event.pointerId && last && gesture.origin) {
      gesture.move(event.clientX, event.clientY);
      if (gesture.dragging) {
        const before = groundPoint(last.x, last.y),
          after = groundPoint(event.clientX, event.clientY);
        if (before && after) rig.pan(before.sub(after));
        canvas.classList.add('dragging');
        onHover(null);
      }
      last = { x: event.clientX, y: event.clientY };
    } else if (active === null) onHover(pick(event.clientX, event.clientY));
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId !== active) return;
    const click = gesture.end(event.clientX, event.clientY);
    active = null;
    last = null;
    canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (click && !blocked()) {
      const action = pick(event.clientX, event.clientY);
      if (action) onAction(action);
    }
  });
  const cancel = () => {
    gesture.cancel();
    active = null;
    last = null;
    canvas.classList.remove('dragging');
    onHover(null);
  };
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  canvas.addEventListener('pointerleave', () => {
    if (active === null) onHover(null);
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (blocked()) return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      rig.zoom(delta);
    },
    { passive: false },
  );
  return { pick };
}
