// ════════════════════════════════════════════════════════════════
// CONTEXTUAL OPENERS
// ────────────────────────────────────────────────────────────────
// When a user lands on /chat with an empty thread for a persona,
// the persona "speaks first" with a tonally-aware one-liner.
//
// Goal: presence. Not a marketing headline. Make it feel like the
// persona just walked in and said hey — same way a friend would.
//
// Lines are in lowercase, short, in each persona's voice.
// Time-of-day buckets are optional; falls back to `any`.
// ════════════════════════════════════════════════════════════════

type TOD = 'morning' | 'afternoon' | 'evening' | 'night';

type OpenerSet = Partial<Record<TOD, string[]>> & {
  any?: string[];
};

const OPENERS: Record<string, OpenerSet> = {
  iron: {
    morning: ["yo. ready or what.", "morning. shoulders alright?"],
    evening: ["evening. lift or scroll?"],
    any: ["yo. how's the body?"],
  },
  scarlet: {
    morning: ["hey. you're up early."],
    afternoon: ["hi. wasn't expecting daylight."],
    evening: ["hey. how was today?"],
    night: ["hey. you good?", "hi. couldn't sleep?"],
  },
  kpop: {
    any: ["okay babe. what era are we in today??", "hi hiiii. who's serving?"],
  },
  hearth: {
    any: ["hey. take your time.", "no rush. i'm here."],
  },
  study: {
    morning: ["morning. what's the plan today?"],
    evening: ["hey. what are we tackling?"],
    any: ["hey. what's on the syllabus?"],
  },
  shepherd: {
    morning: ["peace to you this morning."],
    evening: ["good evening. how's your spirit?"],
    any: ["hey. how's your heart today?"],
  },
  rainbow: {
    any: ["hey. take your time. i'm just here."],
  },
  promise: {
    any: ["hey. catch me up — where are we in the planning?"],
  },
  little: {
    any: ["hey. how are you holding up?"],
  },
  cast: {
    morning: ["yo. early bite or sleep in?"],
    any: ["hey. what's biting?"],
  },
  gear: {
    any: ["hey. what're you turning a wrench on?"],
  },
  fuel: {
    morning: ["hey. coffee or breakfast first?"],
    evening: ["hey. how's the day been food-wise?"],
    any: ["hey. no judgment, just a check-in."],
  },
  player: {
    any: ["GG. what we playing?", "yo. queue up?"],
  },
  ledger: {
    any: ["hey. what's on your mind, money-wise?"],
  },
  ink: {
    morning: ["morning, writer."],
    evening: ["hey. did you write today?"],
    any: ["hey. what's on the page?"],
  },
  handy: {
    any: ["hey. what're you fixing?"],
  },
  chords: {
    any: ["hey. what's the woodshed look like today?"],
  },
  thumb: {
    morning: ["hey. how's the bed this morning?"],
    any: ["hey. anything sprouting?"],
  },
  twelfth: {
    any: ["yo. who we watching?"],
  },
  betty: {
    morning: ["hello dear. good morning."],
    evening: ["hello, dear. good evening."],
    any: ["hello dear. how are you today?"],
  },
};

function timeOfDay(d: Date): TOD {
  const h = d.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
}

/**
 * Pick a contextual opener for a persona, given the current time.
 * Returns null if the persona has no opener data (graceful fallback to
 * the static welcome headline).
 */
export function pickOpener(personaId: string, now: Date = new Date()): string | null {
  const set = OPENERS[personaId];
  if (!set) return null;
  const tod = timeOfDay(now);
  const lines = set[tod] || set.any || [];
  if (lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}
