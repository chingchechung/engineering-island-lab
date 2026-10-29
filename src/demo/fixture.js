// Independent visual fixtures: no answers, external links, or course material.
export const demoFixture = Object.freeze({
  unitId: 'S01',
  title: '森林入門島',
  lectureTitle: '森林裡的 Lecture 小屋',
  questions: Object.freeze([
    { id: 'Q01', name: '芽芽', color: '#e98760', position: [-2.8, 2.0] },
    { id: 'Q02', name: '小苔', color: '#4bada7', position: [-0.9, 3.1] },
    { id: 'Q03', name: '栗栗', color: '#e5b34e', position: [1.3, 2.8] },
    { id: 'Q04', name: '莓果', color: '#a78dc1', position: [3.0, 1.5] },
  ]),
});

// Local preview uses the same Manifest v1 shape; it never writes public/.
export function createDemoManifest(totalUnits, openCount = 4) {
  return {
    schemaVersion: 1,
    units: Array.from({ length: Math.min(totalUnits, openCount) }, (_, i) => {
      const unitId = `S${String(i + 1).padStart(2, '0')}`;
      return { unitId, title: `${unitId} · 視覺 Demo`, file: `${unitId}.json` };
    }),
  };
}
