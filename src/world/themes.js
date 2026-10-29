import { createNatureIsland } from './islands/nature.js';
import { createFantasyIsland } from './islands/fantasy.js';
import { createDreamIsland } from './islands/dream.js';
import { createExtendedIsland } from './islands/extended.js';

export function createThemeIsland(preset) {
  const number = Number(preset.id.slice(1));
  if (number >= 2 && number <= 4) return createNatureIsland(preset);
  if (number <= 8) return createFantasyIsland(preset);
  if (number <= 12) return createDreamIsland(preset);
  if (number <= 15) return createExtendedIsland(preset);
  throw new Error('主題島超出支援範圍');
}
