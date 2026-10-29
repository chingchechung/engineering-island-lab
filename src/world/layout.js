// Six radial trunks and one-hop branches; every prefix from S01 to S15 is connected.
const SPOKES = [
  [14.4, 2, 'academy'],
  [11, -22, 'academy'],
  [-13, -22, 'academy'],
  [-22, 1, 'academy'],
  [-12, 23, 'academy'],
  [13, 24, 'academy'],
  [33, 1, 'S01'],
  [26, -35, 'S02'],
  [-15, -43, 'S03'],
  [-43, -7, 'S04'],
  [-28, 38, 'S05'],
  [17, 46, 'S06'],
  [10, -42, 'S02'],
  [-42, 17, 'S04'],
  [37, 24, 'S06'],
];
export function createRadialLayout(totalUnits) {
  if (!Number.isInteger(totalUnits) || totalUnits < 1 || totalUnits > 15)
    throw new Error('群島數量必須是 1–15');
  return new Map(
    SPOKES.slice(0, totalUnits).map(([x, z, parent], i) => [
      `S${String(i + 1).padStart(2, '0')}`,
      { position: totalUnits === 1 ? [x, z] : [x * 1.3, z * 0.85], parent },
    ]),
  );
}
