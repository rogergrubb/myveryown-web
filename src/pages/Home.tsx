import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERSONAS, getPersona } from '../lib/personas';
import './Home.css';

// ═══════════════════════════════════════════════════════════════
// SLIDESHOW CHOREOGRAPHY
// ═══════════════════════════════════════════════════════════════
// HERO phase (slides 1-5):
//   - Cinematic zoom + parallax on background
//   - Glowing halo around persona
//   - Name fades in like a movie title card
//   - 2.8s per slide (enough time to actually read + click)
//
// NICHE FLASH phase (slides 6-20):
//   - 0.5s per slide, rapid-fire
//   - Shows the catalog depth: "wait, there's 20 of these?!"
//   - Simpler treatment: just background + persona name
//
// Then loops: hero → niche → hero → niche ...
// Cycle length: 5×2.8s + 15×0.5s = 21.5s
// ═══════════════════════════════════════════════════════════════

const HERO_IDS = ['kpop', 'scarlet', 'hearth', 'iron', 'rainbow'];
const HERO_DURATION_MS = 2800;
const NICHE_DURATION_MS = 500;
const HERO_COUNT = HERO_IDS.length;

// Build the ordered slideshow array:
// [hero1, hero2, hero3, hero4, hero5, ...niche1...niche15]
const HEROES = HERO_IDS.map(id => getPersona(id));
const NICHE = PERSONAS.filter(p => !HERO_IDS.includes(p.id));
const SLIDESHOW = [...HEROES, ...NICHE];

export function Home() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [starting, setStarting] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const buddyRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const slide = SLIDESHOW[slideIndex];
  const isHero = slideIndex < HERO_COUNT;

  // Timing: hero phase slow, niche phase fast
  function delayFor(index: number): number {
    return index < HERO_COUNT ? HERO_DURATION_MS : NICHE_DURATION_MS;
  }

  useEffect(() => {
    if (paused) return;
    const delay = delayFor(slideIndex);
    const t = setTimeout(() => setSlideIndex(i => (i + 1) % SLIDESHOW.length), delay);
    return () => clearTimeout(t);
  }, [paused, slideIndex]);

  // Keep the rail centered on active buddy (using index in full PERSONAS array)
  const personaRailIndex = PERSONAS.findIndex(p => p.id === slide.id);
  useEffect(() => {
    const buddy = buddyRefs.current[personaRailIndex];
    const track = trackRef.current;
    if (!buddy || !track) return;
    const buddyCenter = buddy.offsetTop + buddy.offsetHeight / 2;
    const trackHeight = track.offsetHeight;
    const offset = trackHeight / 2 - buddyCenter;
    track.style.transform = `translateY(calc(-50% + ${offset}px))`;
  }, [personaRailIndex]);

  useEffect(() => {
    document.body.setAttribute('data-persona', slide.id);
    document.body.setAttribute('data-phase', isHero ? 'hero' : 'niche');
    return () => {
      document.body.removeAttribute('data-persona');
      document.body.removeAttribute('data-phase');
    };
  }, [slide.id, isHero]);

  const handleStart = () => {
    if (starting) return;
    setStarting(true);
    navigate(`/start/${slide.id}`);
  };

  // Jump directly to a buddy from the rail — skip to the hero phase if applicable
  const jumpTo = (personaId: string) => {
    const idx = SLIDESHOW.findIndex(p => p.id === personaId);
    if (idx >= 0) setSlideIndex(idx);
  };

  return (
    <div
      className={`home ${isHero ? 'phase-hero' : 'phase-niche'}`}
      style={{ '--accent': slide.accent, '--accent-rgb': slide.accentRgb } as any}
    >
      <nav className="home-nav">
        <div className="logo">my very own</div>
        <button className="cta" onClick={handleStart} disabled={starting}>
          {starting ? '…' : `Meet ${slide.name} →`}
        </button>
      </nav>

      {/* HERO PHASE CONTENT */}
      {isHero && (
        <div className="hero">
          {/* Gradient base layer — always present, serves as fallback when video is loading or fails */}
          <div className="slide-bg hero-bg-zoom" style={{ background: slide.bg }} key={`bg-${slide.id}`} />

          {/* Video layer — only for heroes that have one. Muted + autoplay + loop. */}
          {slide.video && (
            <video
              className={`hero-video ${slide.id === 'kpop' ? 'hero-video-kpop' : ''}`}
              key={`video-${slide.id}`}
              src={slide.video}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster=""
              aria-hidden="true"
            />
          )}

          <div className="slide-overlay" />

          {/* Glowing halo centered behind text */}
          <div className="hero-halo" key={`halo-${slide.id}`} />

          <div className="slide-content">
            <div className="slide-left hero-text" key={slide.id}>
              <div className="greeting-pill">
                {slide.ageGate && <span className="age-badge">{slide.ageGate}</span>}{slide.tag}
              </div>
              <h1 className="headline hero-title-fade">{slide.headline}</h1>
              <p className="sub">{slide.sub}</p>
              <div className="starter-row">
                {slide.starters.map((s, i) => <span className="starter-chip" key={i}>{s}</span>)}
              </div>
              <button className="primary-cta" onClick={handleStart} disabled={starting}>
                {starting ? <span className="spinner" /> : `Start talking to ${slide.name} →`}
              </button>
              <div className="cta-note">7 days free · No credit card · No signup</div>
            </div>

            <div className="memory-badge">● Remembers everything about you</div>
          </div>
        </div>
      )}

      {/* NICHE FLASH PHASE — fast, minimal, shows scale */}
      {!isHero && (
        <div className="hero niche-phase">
          <div className="slide-bg niche-bg" style={{ background: slide.bg }} key={`bg-${slide.id}`} />
          <div className="slide-overlay niche-overlay" />

          <div className="slide-content niche-content" key={`content-${slide.id}`}>
            <div className="niche-card">
              <div className="niche-glyph" style={{ color: slide.accent }}>{slide.glyph}</div>
              <div className="niche-name">{slide.name}</div>
              <div className="niche-tag">{slide.tag}</div>
            </div>
          </div>

          {/* Progress tick-marks showing niche flash position */}
          <div className="niche-progress">
            {NICHE.map((_, i) => {
              const absIdx = HERO_COUNT + i;
              return (
                <span
                  key={i}
                  className={`tick ${slideIndex === absIdx ? 'active' : ''} ${slideIndex > absIdx ? 'passed' : ''}`}
                />
              );
            })}
          </div>

          <div className="niche-label-overlay">AND 15 MORE →</div>
        </div>
      )}

      {/* Buddy rail — always visible */}
      <aside className="rail">
        <button className="rail-toggle" onClick={() => setPaused(!paused)} title={paused ? 'Resume' : 'Pause'}>
          {paused ? '▶' : '⏸'}
        </button>
        <div className="rail-panel">
          <div className="rail-fade top" />
          <div className="rail-fade bot" />
          <div className="rail-stage" />
          <div className="rail-viewport">
            <div className="rail-track" ref={trackRef}>
              {PERSONAS.map((p, i) => (
                <button
                  key={p.id}
                  ref={el => (buddyRefs.current[i] = el)}
                  className={`buddy ${p.id === slide.id ? 'active' : ''}`}
                  onClick={() => jumpTo(p.id)}
                  style={{ '--buddy-accent': p.accent, '--buddy-accent-rgb': p.accentRgb } as any}
                  aria-label={`${p.name} · ${p.tag}`}
                >
                  <span className="buddy-glyph">{p.glyph}</span>
                  <span className="buddy-tip">{p.name}<small>{p.tag}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Counter — only show during hero phase; niche flash has its own progress */}
      {isHero && (
        <div className="counter">
          <span className="counter-num">
            <strong>{String(slideIndex + 1).padStart(2, '0')}</strong>
            <span className="counter-separator"> of </span>
            <span className="counter-total">{String(PERSONAS.length).padStart(2, '0')}</span>
          </span>
          <span className="counter-name">{slide.name}</span>
        </div>
      )}
    </div>
  );
}
