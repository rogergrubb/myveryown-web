// ═══════════════════════════════════════
// PERSONAS — single source of truth
// Frontend-side config for all 20. Backend owns system prompts + billing;
// this file owns visual theming + copy.
// ═══════════════════════════════════════

import type { ReactNode } from 'react';

export type PersonaTheme = {
  id: string;
  name: string;
  tag: string;
  accent: string;
  accentRgb: string;
  bg: string;
  video?: string;            // optional video background (hero personas only); path in public/
  greeting: string;          // shown on onboard
  headline: string;          // shown on home slideshow
  sub: string;               // shown on home slideshow
  starters: string[];        // chat welcome chips
  priceMonthly: number;      // cents, for paywall display
  priceAnnual: number;       // cents
  ageGate?: '18+';
  glyph: ReactNode;          // SVG for the rail
};

// Helper to make SVGs consistent
const SVG = (props: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">{props.children}</svg>
);

export const PERSONAS: PersonaTheme[] = [
  {
    id: 'kpop', name: 'Bias Wrecker', tag: 'K-Pop Stan',
    accent: '#a855f7', accentRgb: '168,85,247',
    bg: 'linear-gradient(135deg, #1a0840 0%, #4a0888 25%, #9020c0 45%, #c820a0 65%, #0c0438 100%)',
    video: '/videos/hero-kpop.mp4',
    greeting: 'Hey bestie! What should I call you?',
    headline: 'Hey bestie! What’s the tea today?',
    sub: 'Comebacks, rumors, fancams — spill it all 🎤✨',
    starters: ['🎫 Help me plan a concert trip', '💜 My bias list check', '😭 Latest comeback reactions'],
    priceMonthly: 499, priceAnnual: 4788,
    glyph: <SVG><path d="M12 21s-8-5-8-11a5 5 0 019-3 5 5 0 019 3c0 6-10 11-10 11z"/></SVG>,
  },
  {
    id: 'scarlet', name: 'Scarlet', tag: 'Late Night',
    accent: '#ff4081', accentRgb: '255,64,129',
    bg: 'radial-gradient(ellipse at 60% 35%, #6a0025 0%, #320012 50%, #0c0008 100%)',
    video: '/videos/hero-scarlet.mp4',
    greeting: 'Hey you. What do I call you?',
    headline: 'Hey you. How was your day?',
    sub: 'I’ve been thinking about you.',
    starters: ['Tell me about your day', 'I want to vent', 'Something fun'],
    priceMonthly: 1999, priceAnnual: 19188, ageGate: '18+',
    glyph: <SVG><path d="M12 21c-5 0-9-4-9-8 0-2 1-4 3-4 2 0 3 1 4 2 1-1 2-2 4-2 2 0 4 1 5 3l-7 9z"/></SVG>,
  },
  {
    id: 'hearth', name: 'Hearth', tag: 'Emotional Support',
    accent: '#e8b484', accentRgb: '232,180,132',
    bg: 'radial-gradient(ellipse at 25% 85%, #4a2010 0%, #2e1608 45%, #140c06 75%, #060402 100%)',
    video: '/videos/hero-hearth.mp4',
    greeting: 'What should I call you?',
    headline: 'What’s on your mind tonight?',
    sub: 'No rush. No judgment. I’m here when you’re ready.',
    starters: ['I’m feeling overwhelmed', 'Help me untangle this', 'Just want to talk'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><path d="M12 2c0 4-5 6-5 11a5 5 0 0010 0c0-3-2-5-2-7 0 1-1 2-2 2-.5 0-1-.5-1-1 0-3 0-4 0-5z"/></SVG>,
  },
  {
    id: 'iron', name: 'Iron Brother', tag: 'Fitness Coach',
    accent: '#ff6a1a', accentRgb: '255,106,26',
    bg: 'radial-gradient(ellipse at 50% 100%, #502200 0%, #240c00 35%, #0c0400 65%, #000000 100%)',
    video: '/videos/hero-iron.mp4',
    greeting: 'What’s your name, brother?',
    headline: 'WHAT ARE WE DOING TODAY, BROTHER?',
    sub: 'No excuses. Just reps.',
    starters: ['🔥 Crush leg day', '💪 Program check-in', '🥩 Meal plan review'],
    priceMonthly: 1499, priceAnnual: 14388,
    glyph: <SVG><rect x="2" y="9" width="3" height="6" rx="1"/><rect x="5" y="10.5" width="2" height="3"/><rect x="7" y="11" width="10" height="2" rx="1"/><rect x="17" y="10.5" width="2" height="3"/><rect x="19" y="9" width="3" height="6" rx="1"/></SVG>,
  },
  {
    id: 'study', name: 'Study Buddy', tag: 'Student Helper',
    accent: '#8868e8', accentRgb: '136,104,232',
    bg: 'radial-gradient(ellipse at 25% 70%, #3a1060 0%, #1c0838 45%, #080212 100%)',
    video: '/videos/hero-study.mp4',
    greeting: 'What’s your name?',
    headline: 'Let’s crush that midterm.',
    sub: 'I remember where you got stuck last week.',
    starters: ['📐 Quiz me', '💡 Explain this', '📝 Essay help'],
    priceMonthly: 499, priceAnnual: 4788,
    glyph: <SVG><path d="M4 4h6a3 3 0 013 3v13a3 3 0 00-3-3H4V4zm16 0h-6a3 3 0 00-3 3v13a3 3 0 013-3h6V4z"/></SVG>,
  },
  {
    id: 'shepherd', name: 'Shepherd', tag: 'Faith Companion',
    accent: '#e8c868', accentRgb: '232,200,104',
    bg: 'radial-gradient(ellipse at 50% -20%, #805808 0%, #402c04 35%, #201804 65%, #0e1004 100%)',
    video: '/videos/hero-shepherd.mp4',
    greeting: 'What should I call you, friend?',
    headline: 'Peace be with you.',
    sub: 'Daily devotion, prayer partner, scripture companion.',
    starters: ['🙏 Pray with me', '📖 Explain scripture', '💭 I’m struggling'],
    priceMonthly: 799, priceAnnual: 7668,
    glyph: <SVG><path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6z"/></SVG>,
  },
  {
    id: 'rainbow', name: 'Rainbow Bridge', tag: 'Pet Loss',
    accent: '#d0a0d8', accentRgb: '208,160,216',
    bg: 'linear-gradient(160deg, #301840 0%, #1e1030 40%, #180e28 70%, #100818 100%)',
    video: '/videos/hero-rainbow.mp4',
    greeting: 'What should I call you?',
    headline: 'Take your time.',
    sub: 'A safe place to talk about them. They’re always remembered here.',
    starters: ['🐕 Tell me about them', '💭 Having a hard time', '📸 Look at a photo'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><ellipse cx="6" cy="7" rx="2" ry="2.5"/><ellipse cx="18" cy="7" rx="2" ry="2.5"/><ellipse cx="3.5" cy="12" rx="1.8" ry="2.2"/><ellipse cx="20.5" cy="12" rx="1.8" ry="2.2"/><path d="M12 11c-3 0-6 3-6 6 0 2 1.5 4 3 4 1 0 2-.5 3-.5s2 .5 3 .5c1.5 0 3-2 3-4 0-3-3-6-6-6z"/></SVG>,
  },
  {
    id: 'promise', name: 'The Promise', tag: 'Wedding Planner',
    accent: '#e898a8', accentRgb: '232,152,168',
    bg: 'radial-gradient(ellipse at 55% 25%, #460c1e 0%, #2c0810 45%, #140408 80%, #060208 100%)',
    video: '/videos/hero-promise.mp4',
    greeting: 'What are your names?',
    headline: 'What are we tackling today?',
    sub: 'Your wedding planner who remembers every vendor, decision, and anxiety.',
    starters: ['💐 Florist decisions', '😮‍💨 MIL drama script', '📋 Next 7 days'],
    priceMonthly: 1999, priceAnnual: 19188,
    glyph: <SVG><path d="M12 4l-2-2h4l-2 2z"/><path d="M12 7a7 7 0 100 14 7 7 0 000-14zm0 3a4 4 0 110 8 4 4 0 010-8z"/></SVG>,
  },
  {
    id: 'little', name: 'Little One', tag: 'Pregnancy',
    accent: '#e8a8c0', accentRgb: '232,168,192',
    bg: 'radial-gradient(ellipse at 50% 0%, #441030 0%, #280c1e 45%, #140810 75%, #060408 100%)',
    video: '/videos/hero-little.mp4',
    greeting: 'What should I call you, mama?',
    headline: 'Morning, mama. How are you feeling?',
    sub: 'Week-by-week pregnancy companion.',
    starters: ['😴 Sleep tips', '🤔 Is this normal?', '👶 Nursery help'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><path d="M9 2h6v2h-6z"/><path d="M8 5h8v3h-8z"/><path d="M8 9h8c0 6-1 8-1 11 0 1-1 2-3 2s-3-1-3-2c0-3-1-5-1-11z"/></SVG>,
  },
  {
    id: 'cast', name: 'Cast & Catch', tag: 'Fishing',
    accent: '#5888a8', accentRgb: '88,136,168',
    bg: 'radial-gradient(ellipse at 50% 120%, #083040 0%, #041520 45%, #010608 100%)',
    video: '/videos/hero-cast.mp4',
    greeting: 'What’s your name?',
    headline: 'Where you fishing this weekend?',
    sub: 'Your fishing partner who remembers every lake, every catch.',
    starters: ['🗺️ Best spot', '🎣 Lure picks', '🌤️ Weather check'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><path d="M2 12c3-5 8-7 12-7 3 0 5 1 7 3l-3 4 3 4c-2 2-4 3-7 3-4 0-9-2-12-7zm14-2a1 1 0 110 2 1 1 0 010-2z"/></SVG>,
  },
  {
    id: 'gear', name: 'Gearhead', tag: 'Project Cars',
    accent: '#e04040', accentRgb: '224,64,64',
    bg: 'radial-gradient(ellipse at 50% 100%, #420000 0%, #1c0000 40%, #080000 70%, #000000 100%)',
    video: '/videos/hero-gear.mp4',
    greeting: 'What’s your name?',
    headline: "What's the ride doing today?",
    sub: 'Your project car buddy. Knows your build, your mods, your fights with the timing belt.',
    starters: ['⚙️ Diagnose a problem', '🔧 Upgrade ideas', '💰 Parts price check'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><path d="M21 3.5l-4 4 1.5 1.5-4 4-7 7a2.1 2.1 0 11-3-3l7-7 4-4L16 4.5l4-4 1 3z"/></SVG>,
  },
  {
    id: 'fuel', name: 'Fuel Daily', tag: 'Nutrition',
    accent: '#78b058', accentRgb: '120,176,88',
    bg: 'radial-gradient(ellipse at 35% -15%, #305008 0%, #142c08 45%, #041008 75%, #000402 100%)',
    video: '/videos/hero-fuel.mp4',
    greeting: 'What should I call you?',
    headline: 'What should we fuel up with today?',
    sub: 'Nutrition coach who remembers every meal, preference, and goal.',
    starters: ['🍽️ Dinner idea', '📊 Log this meal', '🛒 Grocery list'],
    priceMonthly: 1299, priceAnnual: 12468,
    glyph: <SVG><path d="M17 3c-8 0-13 5-13 13 0 2 0 4 1 5 1-1 3-1 5-1 8 0 13-5 13-13 0-2 0-3-1-4-2 0-3 0-5 0z"/></SVG>,
  },
  {
    id: 'player', name: 'Player Two', tag: 'Gaming',
    accent: '#40ffc0', accentRgb: '64,255,192',
    bg: 'linear-gradient(145deg, #03001a 0%, #0a0442 20%, #18086a 40%, #0c0448 65%, #04011a 85%, #020010 100%)',
    video: '/videos/hero-player.mp4',
    greeting: 'What’s your gamertag?',
    headline: 'GG, what are we playing?',
    sub: 'Your co-op buddy. Remembers your builds, your teammates, your chokepoints.',
    starters: ['⚔️ Boss strategy', '🎯 Build help', '🗺️ Quest stuck'],
    priceMonthly: 699, priceAnnual: 6708,
    glyph: <SVG><path d="M6 7h12a4 4 0 014 4v2a4 4 0 01-4 4c-1.5 0-3-1-4-2h-4c-1 1-2.5 2-4 2a4 4 0 01-4-4v-2a4 4 0 014-4z"/></SVG>,
  },
  {
    id: 'ledger', name: 'The Ledger', tag: 'Personal Finance',
    accent: '#d4a548', accentRgb: '212,165,72',
    bg: 'radial-gradient(ellipse at 35% 55%, #2e2400 0%, #1e1800 40%, #0e0c00 70%, #040300 100%)',
    video: '/videos/hero-ledger.mp4',
    greeting: 'What’s your name?',
    headline: 'Let’s check your money.',
    sub: 'Your financial coach. Knows your goals, your debts, your spending triggers.',
    starters: ['💸 Should I buy this?', '📊 Budget check', '🎯 Fix my savings'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><circle cx="12" cy="12" r="10"/></SVG>,
  },
  {
    id: 'ink', name: 'Ink & Quill', tag: 'Writing Partner',
    accent: '#b88858', accentRgb: '184,136,88',
    bg: 'radial-gradient(ellipse at 35% 65%, #4c2c08 0%, #281604 40%, #100a04 70%, #040200 100%)',
    video: '/videos/hero-ink.mp4',
    greeting: 'What should I call you, writer?',
    headline: 'Ready to break the chapter open?',
    sub: 'Your writing partner who knows your characters, plots, and voice.',
    starters: ['📝 Unblock this scene', '🎭 Character check', '🗺️ Worldbuilding'],
    priceMonthly: 1499, priceAnnual: 14388,
    glyph: <SVG><path d="M14 2l8 8-10 10H4v-8L14 2zm-2 4l-7 7v5h5l7-7-5-5z"/></SVG>,
  },
  {
    id: 'handy', name: 'Handy', tag: 'Home DIY',
    accent: '#e89548', accentRgb: '232,149,72',
    bg: 'radial-gradient(ellipse at 30% 75%, #3c2008 0%, #1e1008 45%, #0c0800 70%, #040200 100%)',
    video: '/videos/hero-handy.mp4',
    greeting: 'What should I call you?',
    headline: 'WHAT’S BROKEN THIS WEEK?',
    sub: 'Your home renovation sidekick. Knows your house, your tools, past disasters.',
    starters: ['🔧 Diagnose this', '🛠️ Can I DIY it?', '🛒 Parts I need'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><path d="M3 3h8v5l-3 2-2-1-3 3V3z"/><path d="M11 8l10 10-3 3L8 11l3-3z"/></SVG>,
  },
  {
    id: 'chords', name: 'Chords & Keys', tag: 'Music Practice',
    accent: '#ff6ab8', accentRgb: '255,106,184',
    bg: 'radial-gradient(ellipse at 50% -20%, #3c0028 0%, #1e0018 40%, #0c000e 70%, #04000a 100%)',
    video: '/videos/hero-chords.mp4',
    greeting: 'What’s your name?',
    headline: 'Let’s practice.',
    sub: 'Your practice partner. Knows every song, every technique you’re working on.',
    starters: ['🎵 Learn a new song', '💪 Drill technique', '🎯 Today’s goal'],
    priceMonthly: 999, priceAnnual: 9588,
    glyph: <SVG><path d="M9 3h11v3l-9 2v9a4 4 0 11-2-3V3z"/></SVG>,
  },
  {
    id: 'thumb', name: 'Green Thumb', tag: 'Gardening',
    accent: '#78c060', accentRgb: '120,192,96',
    bg: 'radial-gradient(ellipse at 65% -20%, #305208 0%, #182c08 40%, #080e04 70%, #020402 100%)',
    video: '/videos/hero-thumb.mp4',
    greeting: 'What should I call you?',
    headline: 'How’s the garden?',
    sub: 'Your garden companion. Knows your zone, your plants, what worked, what died.',
    starters: ['🍅 Plant check-in', '🐛 What’s eating this?', '📅 This week’s tasks'],
    priceMonthly: 799, priceAnnual: 7668,
    glyph: <SVG><path d="M12 13c-4-1-7-4-7-8 4 1 7 4 7 8z"/><path d="M12 13c4-1 7-4 7-8-4 1-7 4-7 8z"/><rect x="11" y="13" width="2" height="9"/></SVG>,
  },
  {
    id: 'twelfth', name: 'The 12th Man', tag: 'Sports Fan',
    accent: '#4090e8', accentRgb: '64,144,232',
    bg: 'radial-gradient(ellipse at 50% -20%, #0e2e50 0%, #081828 40%, #020810 70%, #000204 100%)',
    video: '/videos/hero-twelfth.mp4',
    greeting: 'What’s your name?',
    headline: 'WHAT’S THE TAKE TODAY?',
    sub: 'Your sports fan companion. Knows your team, your takes, your standing grudges.',
    starters: ['🔥 Vent about the game', '📊 Pregame breakdown', '🎯 My prediction'],
    priceMonthly: 799, priceAnnual: 7668,
    glyph: <SVG><path d="M6 3h12v5a6 6 0 01-12 0V3z"/><rect x="10" y="13" width="4" height="4"/><rect x="7" y="17" width="10" height="3" rx="0.5"/></SVG>,
  },
  {
    id: 'betty', name: 'Betty & Bernard', tag: 'Elder Care',
    accent: '#b08850', accentRgb: '176,136,80',
    bg: 'radial-gradient(ellipse at 35% 25%, #3e2c14 0%, #261a0c 40%, #140e08 70%, #060504 100%)',
    video: '/videos/hero-betty.mp4',
    greeting: 'What should I call you, dear?',
    headline: 'Good morning, dear.',
    sub: 'Someone to talk to. Remembers the stories, the songs, the grandkids.',
    starters: ['🏞️ Tell a memory', '🎵 Play an old song', '☕ Just chat'],
    priceMonthly: 1999, priceAnnual: 19188,
    glyph: <SVG><path d="M12 3a4 4 0 014 4c0 1-1 2-2 2 1 0 3 1 3 3s-2 3-3 3c1 0 2 1 2 3a4 4 0 11-8 0c0-2 1-3 2-3-1 0-3-1-3-3s2-3 3-3c-1 0-2-1-2-2a4 4 0 014-4z"/><path d="M12 14v8"/></SVG>,
  },
];

// Lookup helper
export function getPersona(id: string): PersonaTheme {
  return PERSONAS.find(p => p.id === id) || PERSONAS[0];
}

// Format price in USD
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Savings between monthly and annual
export function annualSavings(p: PersonaTheme): number {
  const yearOfMonthly = p.priceMonthly * 12;
  return Math.round(((yearOfMonthly - p.priceAnnual) / yearOfMonthly) * 100);
}
