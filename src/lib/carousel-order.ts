// ═══════════════════════════════════════════════════════════════
// CAROUSEL ORDER HELPER — interleave premium (video) and free (gradient) personas
// ═══════════════════════════════════════════════════════════════
// For the ViewMaster carousel on the landing page, we want a strict
// visual rhythm: premium tile, free tile, premium, free, premium, free...
//
// The PERSONAS array in personas.tsx is ordered thematically (kpop,
// scarlet, hearth, iron, study, shepherd, ...). We DON'T want to
// reorder that source of truth — other parts of the app depend on it
// (the /start/:id routes, the chat persona metadata, Stripe product
// mapping, etc.).
//
// Instead, this helper produces a VIEW-ONLY array: the same 20
// personas, but re-ordered for display purposes.
//
// Algorithm:
//   1. Partition PERSONAS into two lists: premium (has video) and free (no video)
//   2. Walk alternately from each list, placing one at a time
//   3. When one list runs out, continue with whatever remains
//
// This guarantees:
//   - If counts are 10+10, result is perfectly alternating: P F P F P F ...
//   - If counts are unequal (e.g. 5 videos now, 15 gradients), result
//     starts strictly alternating and tails off with whatever's left
//   - Original PERSONAS array is not mutated
// ═══════════════════════════════════════════════════════════════

import type { PersonaTheme } from './personas';

export function interleavePersonasForCarousel(personas: PersonaTheme[]): PersonaTheme[] {
  const premium = personas.filter(p => p.video);
  const free = personas.filter(p => !p.video);

  const result: PersonaTheme[] = [];
  const maxLen = Math.max(premium.length, free.length);

  // Strict alternation: premium first (because video tiles are the attention-grabbers),
  // then free, then premium, then free. The "premium first" choice is intentional —
  // on randomized start, a premium tile landing in the center seat on first load
  // makes the page feel premium right out of the gate.
  for (let i = 0; i < maxLen; i++) {
    if (i < premium.length) result.push(premium[i]);
    if (i < free.length) result.push(free[i]);
  }

  return result;
}

/**
 * Returns true if a persona has a premium (video) background available.
 * Used for the PREMIUM badge rendering in the carousel tile.
 */
export function isPremium(persona: PersonaTheme): boolean {
  return Boolean(persona.video);
}
