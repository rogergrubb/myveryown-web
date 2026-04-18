import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERSONAS } from '../lib/personas';
import './Home.css';

export function Home() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [starting, setStarting] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const buddyRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Slideshow timing ramp:
  //   Slides 1–4:  1s each (fast teaser — "whoa 20 of these")
  //   Slides 5–9:  gradually ease from 1s → 2s (cubic ease-out curve)
  //   Slide 10+:   2s each (settled into browsing pace)
  function delayForIndex(index: number): number {
    const FAST = 1000;
    const SLOW = 2000;
    const FAST_COUNT = 4;          // slides to stay fast
    const RAMP_LENGTH = 5;         // slides over which to ramp
    if (index < FAST_COUNT) return FAST;
    const progress = Math.min(1, (index - FAST_COUNT) / RAMP_LENGTH);
    // ease-out cubic: fast at start, slow at end
    const eased = 1 - Math.pow(1 - progress, 3);
    return FAST + (SLOW - FAST) * eased;
  }

  useEffect(() => {
    if (paused) return;
    const delay = delayForIndex(current);
    const t = setTimeout(() => setCurrent(c => (c + 1) % PERSONAS.length), delay);
    return () => clearTimeout(t);
  }, [paused, current]);

  useEffect(() => {
    const buddy = buddyRefs.current[current];
    const track = trackRef.current;
    if (!buddy || !track) return;
    const buddyCenter = buddy.offsetTop + buddy.offsetHeight / 2;
    const trackHeight = track.offsetHeight;
    const offset = trackHeight / 2 - buddyCenter;
    track.style.transform = `translateY(calc(-50% + ${offset}px))`;
  }, [current]);

  const slide = PERSONAS[current];

  useEffect(() => {
    document.body.setAttribute('data-persona', slide.id);
    return () => document.body.removeAttribute('data-persona');
  }, [slide.id]);

  const handleStart = () => {
    if (starting) return;
    setStarting(true);
    navigate(`/start/${slide.id}`);
  };

  return (
    <div className="home" style={{ '--accent': slide.accent, '--accent-rgb': slide.accentRgb } as any}>
      <nav className="home-nav">
        <div className="logo">my very own</div>
        <button className="cta" onClick={handleStart} disabled={starting}>
          {starting ? '…' : `Meet ${slide.name} →`}
        </button>
      </nav>

      <div className="hero">
        <div className="slide-bg" style={{ background: slide.bg }} />
        <div className="slide-overlay" />

        <div className="slide-content">
          <div className="slide-left fade-in" key={slide.id}>
            <div className="greeting-pill">
              {slide.ageGate && <span className="age-badge">{slide.ageGate}</span>}{slide.tag}
            </div>
            <h1 className="headline">{slide.headline}</h1>
            <p className="sub">{slide.sub}</p>
            <div className="starter-row">
              {slide.starters.map((s, i) => <span className="starter-chip" key={i}>{s}</span>)}
            </div>
            <button className="primary-cta" onClick={handleStart} disabled={starting}>
              {starting ? <span className="spinner" /> : `Start talking to ${slide.name} →`}
            </button>
            <div className="cta-note">48 hours free · No credit card · No signup</div>
          </div>

          <div className="memory-badge">● Remembers everything about you</div>
        </div>
      </div>

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
                  className={`buddy ${i === current ? 'active' : ''}`}
                  onClick={() => setCurrent(i)}
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

      <div className="counter">
        <span className="counter-num">
          <strong>{String(current + 1).padStart(2, '0')}</strong> / {String(PERSONAS.length).padStart(2, '0')}
        </span>
        <span className="counter-name">{slide.name}</span>
      </div>
    </div>
  );
}
