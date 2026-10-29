import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function attachLabels(labels, onAction) {
  return labels.map((item) => {
    const element = document.createElement(item.action ? 'button' : 'span');
    element.className = `world-label label-${item.kind}`;
    element.textContent = item.text;
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
