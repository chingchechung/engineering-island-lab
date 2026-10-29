import { Box3, Mesh, Raycaster, Vector3 } from 'three';

export const VISITOR_FOOT = 0.025;
export const VISITOR_DECK = 0.075;
const GRID = 0.36;
const RADIUS = 0.13;
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);
const horizontal = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const key = (x, z) => `${x},${z}`;

function frozenMesh(source) {
  const mesh = new Mesh(source.geometry, source.material);
  mesh.matrixAutoUpdate = false;
  mesh.matrixWorld.copy(source.matrixWorld);
  return mesh;
}

// The rendering optimizer removes source meshes. These unparented CPU meshes
// retain the original geometry and world matrices, never the merged render mesh.
function groundSurface(id, root, terrain) {
  root.updateWorldMatrix(true, true);
  const surfaces = [],
    bounds = new Box3().setFromObject(terrain),
    top = terrain.localToWorld(new Vector3(0, terrain.userData.surface?.top ?? 0.8, 0)).y,
    obstacles = [],
    circles = [];
  root.traverse((object) => {
    for (let p = object; p && p !== root; p = p.parent)
      if (p.userData.animated || p.name.startsWith('npc-')) return;
    if (object.name === 'coast-and-cliffs' && object.isMesh) {
      surfaces.push(frozenMesh(object));
      return;
    }
    const obstacle = object.userData.dressingObstacle;
    const softPlant = /planted-|vine|reed|flower|wheat|grass/.test(object.name);
    if (obstacle && obstacle.height > 0.22 && !softPlant) {
      const position = object.getWorldPosition(new Vector3());
      if (position.y + obstacle.height > top + 0.2 && position.y < top + 1.05)
        circles.push({ position, radius: obstacle.radius });
    }
    if (!object.isMesh || object === terrain || object.isInstancedMesh) return;
    // Marked dressing objects are handled once by their small footprint above.
    for (let p = object; p && p !== root; p = p.parent) if (p.userData.dressingObstacle) return;
    const box = new Box3().setFromObject(object),
      size = box.getSize(new Vector3()),
      color = object.material?.color,
      water =
        Boolean(object.userData.water) ||
        Boolean(
          color &&
            size.y < 0.35 &&
            Math.max(size.x, size.z) > 0.65 &&
            color.b > color.r * 1.08 &&
            color.g > color.r * 1.05,
        );
    if (water || (box.max.y > top + 0.18 && box.min.y < top + 1.05))
      obstacles.push({ mesh: frozenMesh(object), box, water });
  });
  // Project upward terrain faces into coarse X/Z bins once. Sampling the real
  // original triangles is much cheaper than raycasting an entire island for
  // each grid footprint, and the CPU data survives render-geometry disposal.
  const terrainBins = new Map();
  for (const surface of surfaces) {
    const attribute = surface.geometry.getAttribute('position'),
      index = surface.geometry.index,
      count = index ? index.count : attribute.count;
    for (let i = 0; i < count; i += 3) {
      const vertex = (j) =>
          new Vector3()
            .fromBufferAttribute(attribute, index ? index.getX(j) : j)
            .applyMatrix4(surface.matrixWorld),
        a = vertex(i),
        b = vertex(i + 1),
        c = vertex(i + 2),
        determinant = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
      if (determinant <= 1e-8) continue;
      const triangle = { a, b, c, determinant };
      for (
        let x = Math.floor(Math.min(a.x, b.x, c.x));
        x <= Math.floor(Math.max(a.x, b.x, c.x));
        x++
      )
        for (
          let z = Math.floor(Math.min(a.z, b.z, c.z));
          z <= Math.floor(Math.max(a.z, b.z, c.z));
          z++
        ) {
          const cell = key(x, z);
          if (!terrainBins.has(cell)) terrainBins.set(cell, []);
          terrainBins.get(cell).push(triangle);
        }
    }
  }
  function terrainHeight(x, z) {
    let height = -Infinity;
    for (const { a, b, c, determinant } of terrainBins.get(key(Math.floor(x), Math.floor(z))) ??
      []) {
      const u = ((z - a.z) * (c.x - a.x) - (x - a.x) * (c.z - a.z)) / determinant,
        v = ((b.z - a.z) * (x - a.x) - (b.x - a.x) * (z - a.z)) / determinant;
      if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7)
        height = Math.max(height, a.y + (b.y - a.y) * u + (c.y - a.y) * v);
    }
    return height;
  }
  const ray = new Raycaster(),
    cache = new Map();
  function sample(x, z) {
    const ix = Math.round(x * 50),
      iz = Math.round(z * 50),
      cacheKey = key(ix, iz);
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    x = ix / 50;
    z = iz / 50;
    ray.set(new Vector3(x, bounds.max.y + 15, z), DOWN);
    const hitHeight = terrainHeight(x, z);
    let value = null;
    if (hitHeight >= top - 0.075) {
      const height = hitHeight;
      let blocked = circles.some(({ position, radius }) => horizontal(position, { x, z }) < radius);
      if (!blocked)
        for (const obstacle of obstacles) {
          const { box } = obstacle;
          if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z) continue;
          const obstruction = ray.intersectObject(obstacle.mesh, false)[0];
          if (
            obstruction &&
            (obstacle.water || (obstruction.point.y > height + 0.18 && box.min.y < height + 1.05))
          ) {
            blocked = true;
            break;
          }
        }
      value = { height, blocked };
    }
    cache.set(cacheKey, value);
    return value;
  }
  function heightAt(x, z) {
    return sample(x, z)?.height ?? null;
  }
  function isSafe(x, z) {
    return [
      [0, 0],
      [RADIUS, 0],
      [-RADIUS, 0],
      [0, RADIUS],
      [0, -RADIUS],
    ].every(([dx, dz]) => {
      const point = sample(x + dx, z + dz);
      return point && !point.blocked;
    });
  }
  function safeSegment(a, b) {
    const distance = horizontal(a, b),
      count = Math.max(1, Math.ceil(distance / 0.03));
    let previous = heightAt(a.x, a.z);
    if (previous === null) return false;
    for (let i = 0; i <= count; i++) {
      const t = i / count,
        x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t,
        y = heightAt(x, z);
      if (y === null || !isSafe(x, z) || Math.abs(y - previous) > 0.03 * 1.4 + 1e-5) return false;
      previous = y;
    }
    return true;
  }

  const nodes = [],
    byCell = new Map();
  for (let ix = Math.ceil(bounds.min.x / GRID); ix <= Math.floor(bounds.max.x / GRID); ix++)
    for (let iz = Math.ceil(bounds.min.z / GRID); iz <= Math.floor(bounds.max.z / GRID); iz++) {
      const x = ix * GRID,
        z = iz * GRID;
      if (!isSafe(x, z)) continue;
      const node = {
        index: nodes.length,
        ix,
        iz,
        position: new Vector3(x, heightAt(x, z) + VISITOR_FOOT, z),
        neighbors: [],
        component: -1,
      };
      nodes.push(node);
      byCell.set(key(ix, iz), node);
    }
  // Four neighbors mean there are no diagonal shortcuts through pond/building corners.
  for (const node of nodes)
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
    ]) {
      const other = byCell.get(key(node.ix + dx, node.iz + dz));
      if (other && safeSegment(node.position, other.position)) {
        node.neighbors.push(other.index);
        other.neighbors.push(node.index);
      }
    }
  const components = [];
  for (const node of nodes) {
    if (node.component >= 0) continue;
    const members = [node.index],
      component = components.length;
    node.component = component;
    for (let i = 0; i < members.length; i++)
      for (const next of nodes[members[i]].neighbors)
        if (nodes[next].component < 0) {
          nodes[next].component = component;
          members.push(next);
        }
    components.push(members);
  }
  const mainComponent = components.reduce(
    (best, value, i) => (value.length > (components[best]?.length ?? 0) ? i : best),
    0,
  );
  function nearest(position, component = null, maxDistance = Infinity) {
    const candidates = nodes
      .filter(
        (node) =>
          (component === null || node.component === component) &&
          horizontal(position, node.position) <= maxDistance,
      )
      .sort((a, b) => horizontal(position, a.position) - horizontal(position, b.position));
    return candidates.find((node) => safeSegment(position, node.position)) ?? null;
  }
  function path(a, b, avoid = []) {
    const start = nearest(a),
      end = nearest(b);
    if (!start || !end || start.component !== end.component) return null;
    const clear = (point) =>
      avoid.every((other) => horizontal(point, other) >= (other.radius ?? 0.68));
    const clearSegment = (p, q) => {
      if (!safeSegment(p, q)) return false;
      const count = Math.max(1, Math.ceil(horizontal(p, q) / 0.12));
      for (let i = 1; i <= count; i++) if (!clear(p.clone().lerp(q, i / count))) return false;
      return true;
    };
    const previous = new Map([[start.index, null]]),
      queue = [start.index];
    for (let i = 0; i < queue.length && !previous.has(end.index); i++)
      for (const next of nodes[queue[i]].neighbors)
        if (!previous.has(next) && clear(nodes[next].position)) {
          previous.set(next, queue[i]);
          queue.push(next);
        }
    if (!previous.has(end.index)) return null;
    const points = [b.clone()];
    for (let index = end.index; index !== null; index = previous.get(index))
      points.push(nodes[index].position.clone());
    points.push(a.clone());
    points.reverse();
    // Greedy visibility smoothing keeps bends around obstacles, and prevents a
    // small tourist from visibly stopping at every cardinal grid intersection.
    const result = [points[0]];
    for (let i = 0; i < points.length - 1; ) {
      let next = points.length - 1;
      while (next > i + 1 && !clearSegment(points[i], points[next])) next--;
      result.push(points[next]);
      i = next;
    }
    return result;
  }
  return {
    id,
    nodes,
    components,
    mainComponent,
    bounds,
    heightAt,
    isSafe,
    safeSegment,
    nearest,
    path,
    sample,
  };
}

/** Small decorative routing graph, restricted to the published island set. */
export function createVisitorNavigation({ academy, records }) {
  if (!academy?.isObject3D || !(records instanceof Map))
    throw new TypeError('Visitors require academy and unit records');
  const open = [...records].filter(([, record]) => record.unlocked),
    allowedIds = open.length ? ['academy', ...open.map(([id]) => id)] : [],
    islands = new Map(),
    edges = [],
    adjacency = new Map(allowedIds.map((id) => [id, []]));
  if (open.length) {
    islands.set(
      'academy',
      groundSurface('academy', academy, academy.getObjectByName('coast-and-cliffs')),
    );
    for (const [id, record] of open)
      islands.set(id, groundSurface(id, record.root, record.terrain));
    for (const [, record] of open) {
      const { link } = record;
      if (!link?.curve || !islands.has(link.from) || !islands.has(link.to)) continue;
      const start = link.curve.getPointAt(0).addScaledVector(UP, VISITOR_DECK),
        end = link.curve.getPointAt(1).addScaledVector(UP, VISITOR_DECK),
        a = islands.get(link.from),
        b = islands.get(link.to),
        startNode = a.nearest(start, null, 2),
        endNode = b.nearest(end, null, 2),
        bankHeightA = a.heightAt(start.x, start.z),
        bankHeightB = b.heightAt(end.x, end.z),
        level =
          bankHeightA !== null &&
          bankHeightB !== null &&
          Math.abs(start.y - bankHeightA) < 0.34 &&
          Math.abs(end.y - bankHeightB) < 0.34,
        edge = {
          from: link.from,
          to: link.to,
          curve: link.curve,
          start,
          end,
          startNode,
          endNode,
          length: link.curve.getLength(),
          enabled: Boolean(startNode && endNode && level),
          reason: !startNode
            ? 'blocked-from-bank'
            : !endNode
              ? 'blocked-to-bank'
              : !level
                ? 'bank-deck-height'
                : null,
        };
      edges.push(edge);
      if (edge.enabled) {
        adjacency.get(edge.from).push(edge);
        adjacency.get(edge.to).push(edge);
      }
    }
  }
  function islandPath(from, to, position = null, destination = null) {
    if (!islands.has(from) || !islands.has(to)) return null;
    const startIsland = islands.get(from),
      endIsland = islands.get(to),
      startComponent = position
        ? startIsland.nearest(position)?.component
        : startIsland.mainComponent,
      endComponent = destination
        ? endIsland.nearest(destination)?.component
        : to === 'academy'
          ? null
          : endIsland.mainComponent,
      first = `${from}:${startComponent}`,
      previous = new Map([[first, null]]),
      queue = [{ id: from, component: startComponent, key: first }];
    let found = null;
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current.id === to && (endComponent === null || current.component === endComponent)) {
        found = current.key;
        break;
      }
      for (const edge of adjacency.get(current.id)) {
        const reverse = edge.to === current.id,
          exit = reverse ? edge.endNode : edge.startNode,
          entry = reverse ? edge.startNode : edge.endNode,
          next = reverse ? edge.from : edge.to,
          nextKey = `${next}:${entry.component}`;
        if (exit.component !== current.component || previous.has(nextKey)) continue;
        previous.set(nextKey, { key: current.key, edge });
        queue.push({ id: next, component: entry.component, key: nextKey });
      }
    }
    if (found === null) return null;
    const result = [];
    for (let at = found; previous.get(at); at = previous.get(at).key)
      result.push(previous.get(at).edge);
    return result.reverse();
  }
  function plan(from, to, position, destination) {
    const itinerary = islandPath(from, to, position, destination);
    if (!itinerary) return null;
    const segments = [];
    let current = from,
      at = position.clone();
    for (const edge of itinerary) {
      const reverse = edge.to === current,
        exit = reverse ? edge.end : edge.start,
        arrival = reverse ? edge.start : edge.end,
        next = reverse ? edge.from : edge.to,
        points = islands.get(current).path(at, exit);
      if (!points) return null;
      segments.push({ kind: 'ground', unitId: current, points });
      segments.push({
        kind: 'bridge',
        from: current,
        to: next,
        curve: edge.curve,
        reverse,
        length: edge.length,
      });
      current = next;
      at = arrival.clone();
    }
    const points = islands.get(current).path(at, destination);
    if (!points) return null;
    segments.push({ kind: 'ground', unitId: current, points });
    return segments;
  }
  return {
    gridSize: GRID,
    footprint: RADIUS,
    allowedIds,
    islands,
    edges,
    adjacency,
    islandPath,
    plan,
  };
}
