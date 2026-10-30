// Appearance only: assignment IDs determine how many explorers exist on each island.
export const NPC_PRESETS = Object.freeze([
  { name: '芽芽', color: '#e98760', position: [-2.8, 2.0] },
  { name: '小苔', color: '#4bada7', position: [-0.9, 3.1] },
  { name: '栗栗', color: '#e5b34e', position: [1.3, 2.8] },
  { name: '莓果', color: '#a78dc1', position: [3.0, 1.5] },
  { name: '小嶼', color: '#739bb8', position: [3.6, 0.1] },
]);

export function questionAppearances(assignment) {
  return assignment.questions.map((question, index) => ({
    id: question.id,
    ...NPC_PRESETS[index],
  }));
}
