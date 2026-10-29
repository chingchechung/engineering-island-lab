import { arrangeLabels } from './label-layout.js';
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

// Labels can grow to readable sizes; fine leader lines keep displaced titles attached.
export function layoutIslandLabels(labels, viewport) {
  const items = labels.filter(
    (item) => item.id === 'academy' || ['unit', 'locked'].includes(item.kind),
  );
  items.forEach((item) => (item.element.style.translate = ''));
  const entries = items
    .map((item) => ({ id: item.id, rect: item.element.getBoundingClientRect(), item }))
    .filter(
      ({ rect }) =>
        rect.width > 0 &&
        rect.right >= viewport.left &&
        rect.left <= viewport.right &&
        rect.bottom >= viewport.top &&
        rect.top <= viewport.bottom,
    );
  const placed = arrangeLabels(entries, viewport);
  let leaders = document.querySelector('#label-lines');
  if (!leaders) {
    leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leaders.id = 'label-lines';
    leaders.setAttribute('aria-hidden', 'true');
    document.querySelector('#world').append(leaders);
  }
  leaders.setAttribute('viewBox', `0 0 ${viewport.width} ${viewport.height}`);
  leaders.style.display = '';
  leaders.replaceChildren();
  for (let i = 0; i < entries.length; i++) {
    const { item, rect } = entries[i],
      position = placed[i];
    item.element.style.translate = `${position.dx}px ${position.dy}px`;
    if (Math.hypot(position.dx, position.dy) < 12) continue;
    const x = (rect.left + rect.right) / 2 - viewport.left,
      y = (rect.top + rect.bottom) / 2 - viewport.top;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', `M ${x} ${y} L ${x + position.dx} ${y + position.dy}`);
    line.setAttribute('stroke', '#688f7e');
    line.setAttribute('stroke-width', '1.2');
    line.setAttribute('opacity', '0.55');
    line.setAttribute('fill', 'none');
    leaders.append(line);
  }
}
