import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERSONAS } from '../lib/personas';
import './Home.css';

// ═══════════════════════════════════════════════════════════════
// VIEWMASTER CAROUSEL — the landing experience
// ═══════════════════════════════════════════════════════════════
// Core question above the fold: "Who do you want to talk with right now?"
//
// User drives the reveal themselves — no autoplay. This is the
// View-Master metaphor: tactile, deliberate, exploratory.
//
// Mechanic:
//   - One persona sits in the center-highlighted "hero seat" (large)
//   - 2-3 personas on each side, scaled smaller with depth falloff
//   - Desktop shows 5-7 visible, mobile shows 3
//   - Advance via: arrow keys, mouse wheel, swipe, or click side persona
//   - First load: randomized start position (solves "Bias Wrecker first" problem)
//
// Background reacts to the centered persona:
//   - Heroes (5): play their video background
//   - Niches (15): use their gradient CSS background
//
// Click the centered persona → navigate to /start/:id
// ═══════════════════════════════════════════════════════════════

// Carousel uses the thematic PERSONAS order directly (no premium-tier interleave).
// Strategy decision (April 2026): every visitor sees the cinematic experience
// from the start — no badges, no tier signals, no "this is the premium one"
// telegraphing. The paywall arrives later via usage-based degradation, not
// upfront tier visibility.

function getRandomStartIndex(): number {
  return Math.floor(Math.random() * PERSONAS.length);
}

export function Home() {
  const navigate = useNavigate();
  const [centerIndex, setCenterIndex] = useState<number>(() => getRandomStartIndex());
  const [starting, setStarting] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastWheelAt = useRef<number>(0);

  const centered = PERSONAS[centerIndex];

  useEffect(() => {
    document.body.dataset.persona = centered.id;
    document.body.style.setProperty('--rail-accent', centered.accent);
    document.body.style.setProperty('--rail-accent-rgb', centered.accentRgb);
    return () => {
      document.body.removeAttribute('data-persona');
    };
  }, [centered]);

  const advance = useCallback((delta: number) => {
    setCenterIndex(prev => {
      const n = PERSONAS.length;
      return ((prev + delta) % n + n) % n;
    });
  }, []);

  const handleChoose = useCallback(() => {
    if (starting) return;
    setStarting(true);
    setTimeout(() => navigate(`/start/${PERSONAS[centerIndex].id}`), 320);
  }, [centerIndex, navigate, starting]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (starting) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); advance(1); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleChoose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, starting, handleChoose]);

  function handleWheel(e: React.WheelEvent) {
    if (starting) return;
    const now = Date.now();
    if (now - lastWheelAt.current < 250) return;
    lastWheelAt.current = now;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 5) return;
    advance(delta > 0 ? 1 : -1);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartX.current;
    const dy = endY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    advance(dx < 0 ? 1 : -1);
  }

  const VISIBLE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
  const slots = VISIBLE_OFFSETS.map(offset => {
    const n = PERSONAS.length;
    const idx = ((centerIndex + offset) % n + n) % n;
    return { offset, persona: PERSONAS[idx] };
  });

  return (
    <div
      className={`vm-home ${starting ? 'starting' : ''}`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="vm-bg-gradient"
        style={{ background: centered.bg }}
        key={`bg-gradient-${centered.id}`}
      />

      {centered.video && (
        <video
          className={`vm-bg-video ${centered.id === 'kpop' ? 'vm-bg-video-kpop' : ''}`}
          key={`bg-video-${centered.id}`}
          src={centered.video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      )}

      <div className="vm-bg-vignette" />

      <nav className="vm-nav">
        <div className="vm-logo">my very own</div>
      </nav>

      <div className="vm-main">
        <h1 className="vm-headline">Who do you want to talk with right now?</h1>
        <p className="vm-subline">
          20 AI companions. Each one remembers you. Forever.
        </p>

        <div className="vm-carousel" role="region" aria-label="Choose a companion to chat with">
          {slots.map(({ offset, persona }) => {
            const isCenter = offset === 0;
            const absOffset = Math.abs(offset);
            return (
              <button
                key={`slot-${offset}-${persona.id}`}
                className={
                  `vm-tile vm-tile-offset-${offset < 0 ? 'n' : 'p'}${absOffset}` +
                  `${isCenter ? ' vm-tile-center' : ''}`
                }
                style={{
                  '--tile-accent': persona.accent,
                  '--tile-accent-rgb': persona.accentRgb,
                  '--tile-bg': persona.bg,
                } as React.CSSProperties}
                onClick={() => {
                  if (isCenter) {
                    handleChoose();
                  } else {
                    advance(offset);
                  }
                }}
                aria-label={isCenter ? `Start chatting with ${persona.name}` : `Move ${persona.name} to center`}
                tabIndex={isCenter ? 0 : -1}
              >
                {persona.ageGate && <span className="vm-tile-age-badge">{persona.ageGate}</span>}
                <div className="vm-tile-inner">
                  <div className="vm-tile-glyph">{persona.glyph}</div>
                  <div className="vm-tile-name">{persona.name}</div>
                  <div className="vm-tile-tag">{persona.tag}</div>
                  {isCenter && (
                    <div className="vm-tile-cta">
                      {starting ? 'Starting…' : 'Chat with me →'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="vm-nav-controls">
          <button
            className="vm-arrow vm-arrow-left"
            onClick={() => advance(-1)}
            aria-label="Previous companion"
          >
            ←
          </button>
          <div className="vm-position">
            <span className="vm-position-current">{centerIndex + 1}</span>
            <span className="vm-position-sep"> / </span>
            <span className="vm-position-total">{PERSONAS.length}</span>
          </div>
          <button
            className="vm-arrow vm-arrow-right"
            onClick={() => advance(1)}
            aria-label="Next companion"
          >
            →
          </button>
        </div>

        <div className="vm-hint">
          <span className="vm-hint-desktop">Scroll, tap arrows, or use ← → keys</span>
          <span className="vm-hint-mobile">Swipe to browse</span>
        </div>

        <p className="vm-trial-note">
          7 days free · No credit card · No signup required
        </p>
      </div>

      <div className="legal-footer" aria-label="Legal">
        <a href="/terms.html">Terms</a>
        <span className="legal-dot">·</span>
        <a href="/privacy.html">Privacy</a>
        <span className="legal-dot">·</span>
        <span className="legal-copy">© 2026 Number One Son</span>
      </div>
    </div>
  );
}
