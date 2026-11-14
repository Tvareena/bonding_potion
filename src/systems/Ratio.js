import { ELEMENTS } from '../core.js';

// Ratio helpers for brewing (GDD §3.4): recipes are ratios, the cauldron holds amounts.

function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }

/** Smallest whole-number form of a recipe, e.g. { water: 2, air: 4 } → { water: 1, air: 2 }. */
export function reduceRatio(recipe) {
  const vals = ELEMENTS.map(e => recipe[e] || 0).filter(v => v > 0);
  const g = vals.reduce((a, v) => gcd(a, v), 0) || 1;
  const out = {};
  ELEMENTS.forEach(e => { if (recipe[e]) out[e] = recipe[e] / g; });
  return out;
}

/** True if the amounts are in exactly the recipe's ratio (and not empty). Elements missing from the recipe must be 0. */
export function sameRatio(amounts, recipe) {
  const sumA = ELEMENTS.reduce((s, e) => s + (amounts[e] || 0), 0);
  const sumR = ELEMENTS.reduce((s, e) => s + (recipe[e] || 0), 0);
  if (sumA <= 0 || sumR <= 0) return false;
  return ELEMENTS.every(e => (amounts[e] || 0) * sumR === (recipe[e] || 0) * sumA);
}

/** How far a mix is from a ratio: sum of differences of each element's share (0 = exact match, max 2). */
export function ratioDistance(amounts, recipe) {
  const sumA = ELEMENTS.reduce((s, e) => s + (amounts[e] || 0), 0);
  const sumR = ELEMENTS.reduce((s, e) => s + (recipe[e] || 0), 0);
  if (sumA <= 0 || sumR <= 0) return 2;
  return ELEMENTS.reduce((s, e) => s + Math.abs((amounts[e] || 0) / sumA - (recipe[e] || 0) / sumR), 0);
}
