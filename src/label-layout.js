// Layout in CSS pixels; font sizes never shrink to make the map fit.
export function arrangeLabels(items, viewport) {
  const occupied = [],
    results = [];
  const inside = (rect) =>
    rect.left >= viewport.left + 4 &&
    rect.right <= viewport.right - 4 &&
    rect.top >= viewport.top + 4 &&
    rect.bottom <= viewport.bottom - 4;
  const clear = (rect) =>
    !occupied.some(
      (other) =>
        rect.left < other.right + 5 &&
        rect.right > other.left - 5 &&
        rect.top < other.bottom + 5 &&
        rect.bottom > other.top - 5,
    );
  for (const item of items) {
    const { rect } = item;
    const make = (dx, dy) => ({
      left: rect.left + dx,
      right: rect.right + dx,
      top: rect.top + dy,
      bottom: rect.bottom + dy,
    });
    const candidates = [[0, 0]];
    for (let ring = 1; ring <= 5; ring++) {
      const x = (rect.right - rect.left) * 0.56 * ring + 8,
        y = (rect.bottom - rect.top + 8) * ring;
      candidates.push([-x, 0], [x, 0], [0, -y], [-x, -y], [x, -y], [0, y], [-x, y], [x, y]);
    }
    const score = ([dx, dy]) => dx * dx + dy * dy * 1.12 + (dy > 0 ? dy * 25 : 0);
    candidates.sort((a, b) => score(a) - score(b));
    let chosen = candidates.find(([dx, dy]) => inside(make(dx, dy)) && clear(make(dx, dy)));
    if (!chosen) {
      const grid = [];
      for (let y = viewport.top + 4; y + rect.bottom - rect.top <= viewport.bottom - 4; y += 20)
        for (let x = viewport.left + 4; x + rect.right - rect.left <= viewport.right - 4; x += 20)
          grid.push([x - rect.left, y - rect.top]);
      grid.sort((a, b) => score(a) - score(b));
      chosen = grid.find(([dx, dy]) => clear(make(dx, dy)));
    }
    chosen ??= [0, 0];
    const [dx, dy] = chosen,
      placed = make(dx, dy);
    occupied.push(placed);
    results.push({ id: item.id, dx, dy, rect: placed });
  }
  return results;
}
