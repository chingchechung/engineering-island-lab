import { arrangeLabels } from './label-layout.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PointerGesture } from './interaction.js';

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
    let cancelGesture = () => {};
    if (item.action) {
      element.type = 'button';
      element.setAttribute('aria-label', item.text);
      // A drag starting on a DOM label belongs to the label, never the canvas.
      // Native buttons can emit click after moving away and back: track excursion.
      const gesture = new PointerGesture();
      let active = null,
        validClick = false;
      cancelGesture = () => {
        const pointerId = active;
        gesture.cancel();
        active = null;
        validClick = false;
        if (pointerId !== null && element.hasPointerCapture(pointerId))
          element.releasePointerCapture(pointerId);
      };
      element.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        validClick = false;
        if (active !== null || event.button !== 0 || event.isPrimary === false) {
          cancelGesture();
          return;
        }
        active = event.pointerId;
        gesture.begin(event.clientX, event.clientY);
        element.setPointerCapture(event.pointerId);
      });
      element.addEventListener('pointermove', (event) => {
        if (active === event.pointerId) gesture.move(event.clientX, event.clientY);
      });
      element.addEventListener('pointerup', (event) => {
        if (active !== event.pointerId) return;
        validClick = gesture.end(event.clientX, event.clientY);
        active = null;
      });
      for (const type of ['pointercancel', 'lostpointercapture'])
        element.addEventListener(type, () => {
          if (active === null) return;
          gesture.cancel();
          active = null;
          validClick = false;
        });
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (event.detail > 0 && !validClick) return;
        onAction(item.action, element);
      });
      element.style.pointerEvents = 'auto';
    }
    const object = new CSS2DObject(element);
    item.anchor.add(object);
    return { ...item, element, object, cancelGesture };
  });
}

export function createDialog() {
  const dialog = document.querySelector('#detail-dialog');
  let previousFocus,
    revision = 0;
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    // A queued native close event can arrive after a newer dialog was opened.
    if (dialog.open) return;
    revision++;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });
  // Native modal dialogs trap focus and make the map inert. Keep scroll inside.
  dialog.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
  const showContent = (
    title,
    node,
    source = document.activeElement,
    kicker = 'ISLAND FIELD NOTES',
    { kind = '' } = {},
  ) => {
    revision++;
    previousFocus = source;
    dialog.classList.toggle('lecture-dialog', kind === 'lecture');
    document.querySelector('#dialog-title').textContent = title;
    document.querySelector('#dialog-kicker').textContent = kicker;
    document.querySelector('#dialog-content').replaceChildren(node);
    document.querySelector('.dialog-scroll').scrollTop = 0;
    if (!dialog.open) dialog.showModal();
    document.querySelector('#close-dialog').focus();
    return revision;
  };
  return {
    get open() {
      return dialog.open;
    },
    get revision() {
      return revision;
    },
    showContent,
    replaceContent(node, expectedRevision) {
      if (!dialog.open || revision !== expectedRevision) return false;
      document.querySelector('#dialog-content').replaceChildren(node);
      return true;
    },
    show(title, paragraphs, source = document.activeElement, kicker = 'ISLAND FIELD NOTES') {
      const content = document.createDocumentFragment();
      for (const text of paragraphs) {
        const p = document.createElement('p');
        p.textContent = text;
        content.append(p);
      }
      return showContent(title, content, source, kicker);
    },
  };
}

// Labels can grow to readable sizes; fine leader lines keep displaced titles attached.
export function layoutIslandLabels(labels, viewport, view = 'overview') {
  const items =
    view === 'overview'
      ? labels.filter((item) => item.id === 'academy' || ['unit', 'locked'].includes(item.kind))
      : [
          ...labels.filter((item) => item.unitId === view && item.kind === 'question'),
          ...labels.filter((item) => item.unitId === view && item.kind === 'lecture'),
          ...labels.filter((item) => item.id === view),
        ];
  labels.forEach((item) => (item.element.style.translate = ''));
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
    line.setAttribute(
      'stroke',
      document.documentElement.dataset.time === 'night' ? '#bdd5ce' : '#688f7e',
    );
    line.setAttribute('stroke-width', '1.2');
    line.setAttribute('opacity', '0.55');
    line.setAttribute('fill', 'none');
    leaders.append(line);
  }
}
