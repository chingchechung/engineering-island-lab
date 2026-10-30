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

export function attachInteraction(options) {
  const { canvas, getPickables, blocked, onAction, onHover } = options;
  const ray = new Raycaster(),
    pointer = new Vector2(),
    plane = new Plane(new Vector3(0, 1, 0), 0),
    pointers = new Set();
  const gesture = new PointerGesture();
  let active = null,
    last = null,
    operation = null,
    primaryButton = false;
  const setRay = (x, y) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((x - rect.left) / rect.width) * 2 - 1, (-(y - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, options.rig.camera);
  };
  const groundPoint = (x, y) => {
    setRay(x, y);
    return ray.ray.intersectPlane(plane, new Vector3());
  };
  const pick = (x, y) => {
    setRay(x, y);
    return ray.intersectObjects(getPickables(), false)[0]?.object.userData.action ?? null;
  };
  const clear = () => {
    const pointerId = active;
    active = null;
    last = null;
    operation = null;
    canvas.classList.remove('dragging');
    if (pointerId !== null && canvas.hasPointerCapture(pointerId))
      canvas.releasePointerCapture(pointerId);
  };
  const cancel = () => {
    // Capture is released below, so an eventual pointerup may land outside the
    // canvas. Do not retain stale IDs; isPrimary rejects remaining touch fingers.
    pointers.clear();
    gesture.cancel();
    clear();
    onHover(null);
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (![0, 2].includes(event.button)) return;
    pointers.add(event.pointerId);
    if (blocked() || active !== null || pointers.size > 1 || event.isPrimary === false) {
      cancel();
      return;
    }
    active = event.pointerId;
    primaryButton = event.button === 0;
    operation =
      event.button === 2 || event.shiftKey || event.pointerType === 'touch' ? 'pan' : 'orbit';
    gesture.begin(event.clientX, event.clientY);
    last = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (blocked()) {
      cancel();
      return;
    }
    if (active === event.pointerId && last && gesture.origin) {
      gesture.move(event.clientX, event.clientY);
      if (gesture.dragging) {
        if (operation === 'orbit')
          options.rig.orbit(event.clientX - last.x, event.clientY - last.y);
        else {
          const before = groundPoint(last.x, last.y),
            after = groundPoint(event.clientX, event.clientY);
          if (before && after) options.rig.pan(before.sub(after));
        }
        canvas.classList.add('dragging');
        onHover(null);
      }
      last = { x: event.clientX, y: event.clientY };
    } else if (active === null && pointers.size === 0) onHover(pick(event.clientX, event.clientY));
  });
  canvas.addEventListener('pointerup', (event) => {
    pointers.delete(event.pointerId);
    if (event.pointerId !== active) return;
    const click = gesture.end(event.clientX, event.clientY) && primaryButton;
    clear();
    if (click && !blocked()) {
      const action = pick(event.clientX, event.clientY);
      if (action) onAction(action);
    }
  });
  canvas.addEventListener('pointercancel', (event) => {
    pointers.delete(event.pointerId);
    if (event.pointerId === active) cancel();
  });
  canvas.addEventListener('lostpointercapture', (event) => {
    if (event.pointerId === active) {
      pointers.delete(event.pointerId);
      cancel();
    }
  });
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
      options.rig.zoom(delta);
    },
    { passive: false },
  );
  return { pick, cancel };
}
