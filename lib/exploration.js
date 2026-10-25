export const EXPLORATION_GOAL = 3;

// Only retain current public catalog IDs; labels always come from the catalog.
export function restoreExplorationIds(serialized, catalog) {
  try {
    const value = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    const allowed = new Set(catalog.map(item => item.id));
    return [...new Set(value.filter(id => typeof id === 'string' && allowed.has(id)))].slice(0, EXPLORATION_GOAL);
  } catch { return []; }
}

export function addExplorationId(current, id, catalog) {
  if (current.length >= EXPLORATION_GOAL || current.includes(id) || !catalog.some(item => item.id === id)) return current;
  return [...current, id];
}
