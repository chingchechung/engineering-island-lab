import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function attachLabels(labels, onAction) {
  return labels.map((item) => {
    const element = document.createElement(item.action ? 'button' : 'span');
    element.className = `world-label label-${item.kind}`;
    if (['unit', 'locked'].includes(item.kind)) {
      const code = document.createElement('strong');
      code.textContent = item.id;
      const name = document.createElement('span');
      name.className = 'island-name';
      name.textContent = item.text.split(' · ')[1];
      element.append(code, name);
    } else element.textContent = item.text;
    element.dataset.label = item.id;
    if (item.action) {
      element.type = 'button';
      element.setAttribute('aria-label', item.text);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        onAction(item.action, element);
      });
      element.style.pointerEvents = 'auto';
    }
    const object = new CSS2DObject(element);
    item.anchor.add(object);
    return { ...item, element, object };
  });
}

export function createDialog() {
  const dialog = document.querySelector('#detail-dialog');
  let previousFocus;
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });
  // Native modal dialogs trap focus and make the map inert. Keep scroll inside.
  dialog.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
  return {
    get open() {
      return dialog.open;
    },
    show(title, paragraphs, source = document.activeElement, kicker = 'ISLAND FIELD NOTES') {
      previousFocus = source;
      document.querySelector('#dialog-title').textContent = title;
      document.querySelector('#dialog-kicker').textContent = kicker;
      const content = document.querySelector('#dialog-content');
      content.replaceChildren();
      for (const text of paragraphs) {
        const p = document.createElement('p');
        p.textContent = text;
        content.append(p);
      }
      if (!dialog.open) dialog.showModal();
      document.querySelector('#close-dialog').focus();
    },
  };
}

// Small screen-space offsets keep overview names readable without moving any island.
export function layoutIslandLabels(labels, viewport) {
  const items = labels.filter(
    (item) => item.id === 'academy' || ['unit', 'locked'].includes(item.kind),
  );
  items.forEach((item) => (item.element.style.translate = ''));
  const rectangles = items.map((item) => ({ item, rect: item.element.getBoundingClientRect() }));
  const occupied = [];
  const candidates = [
    [0, 0],
    [0, -28],
    [-32, 0],
    [32, 0],
    [0, -56],
    [-64, 0],
    [64, 0],
    [0, 28],
    [0, 56],
  ];
  for (const { item, rect } of rectangles) {
    if (
      !rect.width ||
      rect.right < viewport.left ||
      rect.left > viewport.right ||
      rect.bottom < viewport.top ||
      rect.top > viewport.bottom
    )
      continue;
    for (const [x, y] of candidates) {
      const candidate = {
        left: rect.left + x,
        top: rect.top + y,
        right: rect.right + x,
        bottom: rect.bottom + y,
      };
      if (
        candidate.left < viewport.left + 3 ||
        candidate.right > viewport.right - 3 ||
        candidate.top < viewport.top + 3 ||
        candidate.bottom > viewport.bottom - 3
      )
        continue;
      if (
        occupied.some(
          (other) =>
            candidate.left < other.right + 3 &&
            candidate.right > other.left - 3 &&
            candidate.top < other.bottom + 3 &&
            candidate.bottom > other.top - 3,
        )
      )
        continue;
      item.element.style.translate = `${x}px ${y}px`;
      occupied.push(candidate);
      break;
    }
  }
}
