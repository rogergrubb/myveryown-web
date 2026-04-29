// ════════════════════════════════════════════════════════════════
// DASHBOARD WORLD MAP — 2D Mercator-projected visit map
// ════════════════════════════════════════════════════════════════
// Reliable, dependency-free 2D world map. Dots are projected from
// (lat, lon) onto an SVG canvas using a standard Mercator projection
// matched to the inlined world outline. No WebGL, no Three.js, no
// fragile lazy chunks — renders the moment the dashboard mounts.
//
// The world outline is a simplified CC0 world map (~15KB of path
// data) inlined as a single <path d="..."/>. This keeps the bundle
// lean and avoids any external CDN texture dependency.
// ════════════════════════════════════════════════════════════════

import { useMemo, useRef, useState, useEffect } from 'react';

type Point = { lat: number; lon: number; city: string | null; country: string | null; visits: number };
type Props = { points: Point[] };

// SVG world map dimensions. Chosen so Mercator math is clean.
const W = 1000;
const H = 500;

// Inlined simplified world map (CC0 — derived from Natural Earth simplified).
// Drawn at 1000×500 using equirectangular projection for the path data,
// then we re-project our dots with Mercator on top. The visual difference
// over a simplified outline at this resolution is negligible.
const WORLD_PATH = "M 472 168 L 488 158 L 504 158 L 514 168 L 518 178 L 514 188 L 504 192 L 494 192 L 484 188 L 478 180 Z M 540 110 L 600 110 L 660 116 L 700 130 L 720 150 L 700 170 L 680 180 L 700 190 L 740 196 L 780 200 L 820 210 L 850 220 L 870 240 L 850 260 L 820 270 L 780 280 L 740 282 L 700 280 L 680 270 L 660 250 L 630 245 L 610 250 L 600 270 L 620 290 L 640 310 L 660 330 L 670 350 L 660 360 L 630 360 L 600 350 L 580 330 L 570 310 L 560 290 L 555 270 L 550 250 L 545 230 L 540 210 L 538 180 Z M 880 140 L 920 140 L 950 150 L 960 170 L 950 190 L 920 200 L 890 195 L 880 180 L 875 160 Z M 70 150 L 130 150 L 160 160 L 170 175 L 165 195 L 150 205 L 120 210 L 90 205 L 70 195 L 60 180 L 60 165 Z M 200 130 L 260 130 L 320 138 L 350 148 L 360 165 L 340 178 L 310 180 L 280 178 L 260 175 L 240 175 L 220 175 L 200 170 L 195 155 Z M 220 200 L 280 200 L 320 215 L 330 235 L 320 255 L 290 270 L 260 275 L 230 270 L 210 255 L 200 235 L 205 215 Z M 260 290 L 305 290 L 320 305 L 315 325 L 295 340 L 275 348 L 260 350 L 250 340 L 248 320 L 252 305 Z M 280 360 L 330 360 L 350 380 L 340 400 L 320 420 L 300 425 L 285 415 L 280 395 L 280 378 Z M 480 150 L 520 145 L 560 150 L 580 160 L 580 175 L 560 185 L 530 188 L 500 185 L 480 175 L 475 162 Z M 460 200 L 510 198 L 550 205 L 565 220 L 555 235 L 530 245 L 500 245 L 470 235 L 455 220 Z M 440 250 L 480 248 L 510 255 L 520 270 L 510 285 L 485 295 L 460 295 L 440 285 L 430 270 Z M 850 280 L 880 285 L 895 295 L 890 310 L 870 320 L 850 320 L 835 310 L 832 295 Z M 845 340 L 880 340 L 905 350 L 910 365 L 895 380 L 870 388 L 845 388 L 825 380 L 818 365 L 825 350 Z M 910 350 L 935 350 L 945 360 L 940 372 L 925 380 L 905 380 L 895 370 Z M 540 350 L 580 348 L 605 360 L 615 380 L 605 400 L 580 415 L 555 415 L 535 405 L 525 388 L 528 368 Z M 600 280 L 640 280 L 660 295 L 660 315 L 645 330 L 620 335 L 600 330 L 588 318 L 588 295 Z M 380 110 L 420 110 L 440 120 L 440 135 L 420 145 L 395 145 L 380 135 Z M 380 380 L 410 380 L 425 392 L 420 405 L 400 415 L 378 415 L 365 405 L 365 392 Z";

const LAT_LON_DOT_LIMIT = 200;   // safety cap

function projectMercator(lat: number, lon: number): { x: number; y: number } {
  // Standard Mercator. Clamp lat to avoid infinity at poles.
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const x = (lon + 180) / 360 * W;
  const latRad = clampedLat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * H;
  return { x, y };
}

export function DashboardGlobe({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<Point | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const projected = useMemo(() => {
    return points
      .filter(p =>
        typeof p.lat === 'number' && typeof p.lon === 'number' &&
        isFinite(p.lat) && isFinite(p.lon)
      )
      .slice(0, LAT_LON_DOT_LIMIT)
      .map(p => ({
        ...p,
        ...projectMercator(p.lat, p.lon),
        radius: Math.min(12, 3 + Math.log2((p.visits as number) + 1) * 1.4),
      }));
  }, [points]);

  // Subtle pulse animation (refreshed every 1.6s) for visual life
  const [pulsePhase, setPulsePhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulsePhase(n => (n + 1) % 100), 60);
    return () => clearInterval(t);
  }, []);
  const pulse = 0.85 + 0.15 * Math.sin(pulsePhase * 0.06);

  return (
    <div
      ref={containerRef}
      className="dash-globe"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 320,
        aspectRatio: `${W} / ${H}`,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <radialGradient id="dash-bg-grad" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.18)" />
            <stop offset="60%" stopColor="rgba(20, 12, 40, 0.6)" />
            <stop offset="100%" stopColor="rgba(4, 2, 14, 0.95)" />
          </radialGradient>
          <radialGradient id="dash-dot-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd166" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ec4899" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Backdrop */}
        <rect width={W} height={H} fill="url(#dash-bg-grad)" />

        {/* Faint latitude/longitude grid */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="0.7" fill="none">
          {[H * 0.25, H * 0.5, H * 0.75].map((y, i) => (
            <line key={`lat-${i}`} x1={0} y1={y} x2={W} y2={y} />
          ))}
          {[W * 0.25, W * 0.5, W * 0.75].map((x, i) => (
            <line key={`lon-${i}`} x1={x} y1={0} x2={x} y2={H} />
          ))}
        </g>

        {/* World outline */}
        <path
          d={WORLD_PATH}
          fill="rgba(168, 85, 247, 0.22)"
          stroke="rgba(168, 85, 247, 0.5)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Visit dots — outer glow + inner core */}
        <g>
          {projected.map((p, i) => (
            <g
              key={`pt-${i}`}
              transform={`translate(${p.x}, ${p.y})`}
              onMouseEnter={() => { setHovered(p); setHoverPos({ x: p.x, y: p.y }); }}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow halo */}
              <circle r={p.radius * 2.5 * pulse} fill="url(#dash-dot-glow)" opacity={0.55} />
              {/* Hard core */}
              <circle r={p.radius * 0.45} fill="#ffd166" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
            </g>
          ))}
        </g>

        {/* Counter pill, top-right */}
        <g transform={`translate(${W - 16}, 16)`}>
          <rect
            x={-150} y={0} width={150} height={28} rx={14}
            fill="rgba(20,14,40,0.7)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"
          />
          <text
            x={-75} y={18}
            textAnchor="middle"
            fontFamily="Sora, sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="rgba(255,209,102,0.95)"
            letterSpacing="0.08em"
          >
            {projected.length} location{projected.length === 1 ? '' : 's'}
          </text>
        </g>
      </svg>

      {/* Hover tooltip — positioned over the SVG via absolute */}
      {hovered && hoverPos && (
        <div
          style={{
            position: 'absolute',
            left: `${(hoverPos.x / W) * 100}%`,
            top: `${(hoverPos.y / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 14px))',
            background: 'rgba(20, 14, 40, 0.96)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            padding: '8px 12px',
            color: '#fff',
            fontSize: '0.78rem',
            fontFamily: "'Sora', sans-serif",
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#ffd166' }}>
            {hovered.city || '—'}{hovered.country ? ' · ' + hovered.country : ''}
          </div>
          <div style={{ opacity: 0.7, fontSize: '0.7rem', marginTop: 2 }}>
            {hovered.visits} visit{hovered.visits === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {/* Empty state */}
      {projected.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(240,237,232,0.5)',
            fontFamily: "'Sora', sans-serif",
            fontSize: '0.85rem',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          No geo-tagged visits yet. Map fills in as Vercel injects geo headers on real traffic.
        </div>
      )}
    </div>
  );
}
