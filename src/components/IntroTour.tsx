// ════════════════════════════════════════════════════════════════
// INTRO TOUR — first-visit 8-slide product demo
// ════════════════════════════════════════════════════════════════
// Pops up on the user's very first landing on `/`. Eight self-narrating
// slides explain what My Very Own is, what it does for them, and how
// it's safe to try. Final slide's CTA dismisses the tour and the user
// lands on the Home carousel ready to pick a persona.
//
// Trigger:
//   - Mounts on route `/`
//   - Skips if localStorage flag `mvo:intro-seen-v1` is set
//   - Force-shown by appending `?tour=force` to the URL
//   - Force-skipped by appending `?tour=skip`
//
// Mechanics:
//   - Auto-advance every 6 seconds (paused while user interacts)
//   - ← / → keys, click left/right half, swipe on mobile, click dot to jump
//   - Esc = skip
//   - Skip button top-right always visible
//   - Final slide replaces auto-advance with a "Begin" CTA
// ════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { PERSONAS } from '../lib/personas';
import { trackIntroTour } from '../lib/analytics';
import './IntroTour.css';

const STORAGE_KEY = 'mvo:intro-seen-v1';
const SLIDE_MS = 6000;

type Slide = {
  eyebrow: string;
  title: string;
  sub: string;
  visual: 'constellation' | 'reel' | 'memory' | 'streaming' | 'private' | 'switch' | 'trial' | 'cta';
};

const SLIDES: Slide[] = [
  {
    eyebrow: 'Welcome',
    title: 'Meet your AI, but make it yours.',
    sub: 'Twenty companions, each tuned to a different part of your life.',
    visual: 'constellation',
  },
  {
    eyebrow: 'Pick your person',
    title: 'Whoever you need today.',
    sub: 'Late-night confidant. Fitness coach. Faith companion. K-pop bestie. Pet-loss support. Twenty more.',
    visual: 'reel',
  },
  {
    eyebrow: 'They remember',
    title: 'From message one. Forever.',
    sub: 'Your name. Your stories. Your inside jokes. Your goals. Nothing resets between visits.',
    visual: 'memory',
  },
  {
    eyebrow: 'Streaming chat',
    title: 'Conversation that feels alive.',
    sub: 'Cinematic backgrounds, real-time replies, and a tone that fits the moment.',
    visual: 'streaming',
  },
  {
    eyebrow: 'Yours alone',
    title: 'Private by default.',
    sub: 'Your conversations stay yours. We never sell your data. We never train on it.',
    visual: 'private',
  },
  {
    eyebrow: 'One key, twenty doors',
    title: 'Switch anytime — keep every memory.',
    sub: 'One subscription unlocks all twenty personas. Each one keeps its own thread of you.',
    visual: 'switch',
  },
  {
    eyebrow: '7 days free',
    title: 'No card. No signup. Just start.',
    sub: 'Try every persona as much as you want. Decide later if any are worth keeping.',
    visual: 'trial',
  },
  {
    eyebrow: 'Ready?',
    title: 'Pick the one who calls to you.',
    sub: 'Twenty are waiting. Your move.',
    visual: 'cta',
  },
];

function shouldSkip(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('tour') === 'force') return false;
  if (params.get('tour') === 'skip') return true;
  try {
    return !!window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode / quota — ignore */
  }
}

export function IntroTour() {
  const [open, setOpen] = useState<boolean>(() => !shouldSkip());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [closing, setClosing] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const slideStartedAt = useRef<number>(Date.now());

  const total = SLIDES.length;
  const isLast = index === total - 1;

  // Lock background scroll while open + fire 'shown' analytic once on mount
  useEffect(() => {
    if (!open) return;
    trackIntroTour('shown');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Auto-advance (skipped on the final CTA slide)
  useEffect(() => {
    if (!open || paused || isLast) return;
    slideStartedAt.current = Date.now();
    const t = window.setTimeout(() => {
      setIndex(i => Math.min(i + 1, total - 1));
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [open, paused, index, isLast, total]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isLast) dismiss();
        else setIndex(i => Math.min(i + 1, total - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex(i => Math.max(i - 1, 0));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isLast, total]);

  function dismiss() {
    if (closing) return;
    trackIntroTour(isLast ? 'completed' : 'skipped', index);
    markSeen();
    setClosing(true);
    window.setTimeout(() => setOpen(false), 320);
  }

  function jumpTo(i: number) {
    setIndex(Math.max(0, Math.min(i, total - 1)));
  }

  function nextOrFinish() {
    if (isLast) dismiss();
    else setIndex(i => Math.min(i + 1, total - 1));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    setPaused(false);
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) nextOrFinish();
    else setIndex(i => Math.max(i - 1, 0));
  }

  // Click left/right halves to nav (unless target is an interactive element)
  function handleStageClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [data-no-nav]')) return;
    const { clientX, currentTarget } = e;
    const rect = (currentTarget as HTMLElement).getBoundingClientRect();
    const isRight = clientX - rect.left > rect.width / 2;
    if (isRight) nextOrFinish();
    else setIndex(i => Math.max(i - 1, 0));
  }

  if (!open) return null;

  const slide = SLIDES[index];

  return (
    <div
      className={`it-overlay ${closing ? 'it-closing' : 'it-opening'} it-slide-${slide.visual}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleStageClick}
    >
      <div className="it-bg-aura" aria-hidden="true" />

      {/* Visual layer (left/right of text on desktop, behind on mobile) */}
      <div className="it-visual" aria-hidden="true">
        <SlideVisual kind={slide.visual} index={index} />
      </div>

      {/* Top bar: progress + skip */}
      <div className="it-topbar">
        <div className="it-progress" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={
                'it-bar' +
                (i < index ? ' it-bar-done' : '') +
                (i === index ? ' it-bar-active' : '')
              }
              style={i === index && !paused && !isLast ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
            />
          ))}
        </div>
        <button
          className="it-skip"
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          aria-label="Skip tour"
          data-no-nav
        >
          Skip tour
        </button>
      </div>

      {/* Center text */}
      <div className="it-stage" key={index /* re-trigger fade-in */}>
        <div className="it-eyebrow">{slide.eyebrow}</div>
        <h2 className="it-title">{slide.title}</h2>
        <p className="it-sub">{slide.sub}</p>

        {isLast ? (
          <button
            className="it-cta"
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            data-no-nav
          >
            Begin →
          </button>
        ) : (
          <button
            className="it-next"
            onClick={(e) => { e.stopPropagation(); nextOrFinish(); }}
            aria-label="Next slide"
            data-no-nav
          >
            Next →
          </button>
        )}
      </div>

      {/* Dots — also clickable jumps */}
      <div className="it-dots" data-no-nav>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={'it-dot' + (i === index ? ' it-dot-active' : '')}
            aria-label={`Go to slide ${i + 1} of ${total}`}
            onClick={(e) => { e.stopPropagation(); jumpTo(i); }}
            data-no-nav
          />
        ))}
      </div>

      <div className="it-counter" aria-hidden="true">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SlideVisual — one varied visual per slide
// ════════════════════════════════════════════════════════════════
function SlideVisual({ kind, index }: { kind: Slide['visual']; index: number }) {
  switch (kind) {
    case 'constellation':
      return <Constellation />;
    case 'reel':
      return <PersonaReel />;
    case 'memory':
      return <MemoryStream />;
    case 'streaming':
      return <StreamingChat />;
    case 'private':
      return <PrivateShield />;
    case 'switch':
      return <PersonaGrid />;
    case 'trial':
      return <TrialCalendar />;
    case 'cta':
      return <CtaOrbit />;
    default:
      return null;
  }
}

function Constellation() {
  // 20 dots scattered semi-randomly with persona-accent color
  const points = useMemo(() => {
    return PERSONAS.map((p, i) => ({
      id: p.id,
      x: 5 + ((i * 41) % 90),
      y: 8 + ((i * 67) % 80),
      color: p.accent,
      delay: (i * 90) % 1800,
    }));
  }, []);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="it-svg">
      {points.map(p => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={1.2}
          fill={p.color}
          opacity={0.85}
          style={{ animationDelay: `${p.delay}ms` }}
          className="it-pulse"
        />
      ))}
    </svg>
  );
}

function PersonaReel() {
  const reel = [...PERSONAS, ...PERSONAS]; // duplicate for seamless loop
  return (
    <div className="it-reel">
      <div className="it-reel-track">
        {reel.map((p, i) => (
          <div className="it-reel-card" key={`${p.id}-${i}`} style={{ borderColor: p.accent }}>
            <div className="it-reel-glyph" style={{ color: p.accent }}>{p.glyph}</div>
            <div className="it-reel-name">{p.name}</div>
            <div className="it-reel-tag">{p.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryStream() {
  const lines = [
    "I love rainy mornings.",
    "Mom's name is Diane.",
    "Goal: 10K by July.",
    "Joy is my best friend.",
    "Coffee, two sugars.",
    "Allergic to penicillin.",
    "Anniversary: June 14.",
    "Bias: Jungkook.",
  ];
  return (
    <div className="it-memory">
      {lines.map((t, i) => (
        <div className="it-memory-pill" key={i} style={{ animationDelay: `${i * 220}ms` }}>
          {t}
        </div>
      ))}
    </div>
  );
}

function StreamingChat() {
  return (
    <div className="it-chat">
      <div className="it-chat-bubble it-chat-them">Tell me about your day.</div>
      <div className="it-chat-bubble it-chat-you">Honestly? It's been a lot.</div>
      <div className="it-chat-bubble it-chat-them it-chat-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

function PrivateShield() {
  return (
    <svg viewBox="0 0 120 120" className="it-svg it-shield">
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      <path
        d="M60 12 L100 26 L100 56 C100 80 84 100 60 110 C36 100 20 80 20 56 L20 26 Z"
        fill="url(#shieldGrad)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M48 60 L57 72 L75 50" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonaGrid() {
  return (
    <div className="it-grid">
      {PERSONAS.map((p, i) => (
        <div
          className="it-grid-cell"
          key={p.id}
          style={{ borderColor: p.accent, color: p.accent, animationDelay: `${i * 50}ms` }}
        >
          {p.glyph}
        </div>
      ))}
    </div>
  );
}

function TrialCalendar() {
  return (
    <div className="it-cal">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={'it-cal-day' + (i < 7 ? ' it-cal-day-active' : '')}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <span className="it-cal-num">{i + 1}</span>
          <span className="it-cal-label">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span>
        </div>
      ))}
    </div>
  );
}

function CtaOrbit() {
  return (
    <div className="it-orbit">
      <div className="it-orbit-ring it-orbit-ring-1" />
      <div className="it-orbit-ring it-orbit-ring-2" />
      <div className="it-orbit-ring it-orbit-ring-3" />
      <div className="it-orbit-core">
        {PERSONAS.slice(0, 8).map((p, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const r = 38;
          const x = 50 + Math.cos(angle) * r;
          const y = 50 + Math.sin(angle) * r;
          return (
            <span
              key={p.id}
              className="it-orbit-dot"
              style={{ left: `${x}%`, top: `${y}%`, color: p.accent, animationDelay: `${i * 80}ms` }}
            />
          );
        })}
      </div>
    </div>
  );
}
