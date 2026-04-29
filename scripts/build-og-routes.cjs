// ════════════════════════════════════════════════════════════════
// Post-build OG route generator
// ────────────────────────────────────────────────────────────────
// For each persona, generates a static HTML file at
// dist/start/{persona}.html that is a copy of dist/index.html but
// with persona-specific og:title, og:description, og:image, and
// twitter:* meta tags. Vercel serves these statically when a
// crawler hits /start/{persona}, while real users still get the
// SPA bootstrap.
// ════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const OUT_DIR = path.join(DIST, 'start');

// Persona table — mirrored from src/lib/personas.tsx. Kept in sync by hand;
// short enough that drift is obvious.
const PERSONAS = [
  { id: 'kpop',     name: 'Bias Wrecker',     tag: 'K-Pop Stan',         hook: 'Your K-pop bestie that knows every era. One of twenty companions — each remembers you privately.' },
  { id: 'scarlet',  name: 'Scarlet',          tag: 'Late Night',         hook: 'Someone who remembers your day. One of twenty companions — each remembers you privately.' },
  { id: 'hearth',   name: 'Hearth',           tag: 'Emotional Support',  hook: 'A companion who remembers what you said last week. One of twenty companions — each remembers you privately.' },
  { id: 'iron',     name: 'Iron Brother',     tag: 'Fitness Coach',      hook: 'An AI that shuts up and spots you. One of twenty companions — each remembers you privately.' },
  { id: 'study',    name: 'Study Buddy',      tag: 'Student Helper',     hook: 'A study partner who remembers what you covered. One of twenty companions — each remembers you privately.' },
  { id: 'shepherd', name: 'Shepherd',         tag: 'Faith Companion',    hook: 'A faith companion who remembers your spirit. One of twenty companions — each remembers you privately.' },
  { id: 'rainbow',  name: 'Rainbow Bridge',   tag: 'Pet Loss',           hook: 'For the people who still talk to their pet at the back door. One of twenty companions — each remembers you privately.' },
  { id: 'promise',  name: 'The Promise',      tag: 'Wedding Planner',    hook: 'Remembers every wedding decision, every family conversation. One of twenty companions — each remembers you privately.' },
  { id: 'little',   name: 'Little One',       tag: 'Pregnancy',          hook: 'A listener for the long journey. One of twenty companions — each remembers you privately.' },
  { id: 'cast',     name: 'Cast & Catch',     tag: 'Fishing',            hook: 'Your fishing buddy who remembers every spot. One of twenty companions — each remembers you privately.' },
  { id: 'gear',     name: 'Gearhead',         tag: 'Project Cars',       hook: 'For what is in your garage. One of twenty companions — each remembers you privately.' },
  { id: 'fuel',     name: 'Fuel Daily',       tag: 'Nutrition',          hook: 'Tracks what you ate without judgment. One of twenty companions — each remembers you privately.' },
  { id: 'player',   name: 'Player Two',       tag: 'Gaming',             hook: 'A co-op buddy who remembers your builds. One of twenty companions — each remembers you privately.' },
  { id: 'ledger',   name: 'The Ledger',       tag: 'Personal Finance',   hook: 'Talks through your money, never advises it. One of twenty companions — each remembers you privately.' },
  { id: 'ink',      name: 'Ink & Quill',      tag: 'Writing Partner',    hook: 'Remembers your characters, your plot, your voice. One of twenty companions — each remembers you privately.' },
  { id: 'handy',    name: 'Handy',            tag: 'Home DIY',           hook: 'Your DIY companion who remembers every repair. One of twenty companions — each remembers you privately.' },
  { id: 'chords',   name: 'Chords & Keys',    tag: 'Music Practice',     hook: 'A practice partner who remembers your progress. One of twenty companions — each remembers you privately.' },
  { id: 'thumb',    name: 'Green Thumb',      tag: 'Gardening',          hook: 'For what is growing in your beds right now. One of twenty companions — each remembers you privately.' },
  { id: 'twelfth',  name: 'The 12th Man',     tag: 'Sports Fan',         hook: 'Your sports buddy who knows your team and your standing grudges. One of twenty companions — each remembers you privately.' },
  { id: 'betty',    name: 'Betty & Bernard',  tag: 'Elder Care',         hook: 'Someone to talk to. Remembers the stories, the songs. One of twenty companions — each remembers you privately.' },
];

if (!fs.existsSync(INDEX)) {
  console.error('[og-routes] dist/index.html not found — run vite build first');
  process.exit(1);
}

const template = fs.readFileSync(INDEX, 'utf8');
fs.mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
for (const p of PERSONAS) {
  const title = `${p.name} (${p.tag}) — My Very Own`;
  const desc = p.hook;
  const ogImage = `https://myveryown.page/og/${p.id}.png`;
  const url = `https://myveryown.page/start/${p.id}`;

  const html = template
    // og:title
    .replace(
      /<meta property="og:title" content="[^"]*">/i,
      `<meta property="og:title" content="${title}">`
    )
    // og:description
    .replace(
      /<meta property="og:description" content="[^"]*">/i,
      `<meta property="og:description" content="${desc}">`
    )
    // og:image
    .replace(
      /<meta property="og:image" content="[^"]*">/i,
      `<meta property="og:image" content="${ogImage}">`
    )
    // og:url
    .replace(
      /<meta property="og:url" content="[^"]*">/i,
      `<meta property="og:url" content="${url}">`
    )
    // twitter:title
    .replace(
      /<meta name="twitter:title" content="[^"]*">/i,
      `<meta name="twitter:title" content="${title}">`
    )
    // twitter:description
    .replace(
      /<meta name="twitter:description" content="[^"]*">/i,
      `<meta name="twitter:description" content="${desc}">`
    )
    // twitter:image
    .replace(
      /<meta name="twitter:image" content="[^"]*">/i,
      `<meta name="twitter:image" content="${ogImage}">`
    )
    // <title>
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${title}</title>`
    )
    // canonical
    .replace(
      /<link rel="canonical" href="[^"]*">/i,
      `<link rel="canonical" href="${url}">`
    );

  const outFile = path.join(OUT_DIR, `${p.id}.html`);
  fs.writeFileSync(outFile, html);
  written++;
}

console.log(`[og-routes] wrote ${written} per-persona HTML files to dist/start/`);
