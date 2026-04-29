// ════════════════════════════════════════════════════════════════
// DASHBOARD WORLD MAP — d3-geo Mercator with real country outlines
// ════════════════════════════════════════════════════════════════
// Uses the standard Natural Earth world-atlas topojson (countries-110m,
// ~100KB) projected via d3-geo's Mercator + geoPath. Same coordinate
// system used to project visit dots, so they land on the real cities.
//
// No external CDN, no WebGL, no Three.js — everything bundled and
// rendered as a single static SVG.
// ════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { geoMercator, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';

type Point = { lat: number; lon: number; city: string | null; country: string | null; visits: number };
type Props = { points: Point[] };

// SVG canvas dims — wide aspect, matches dashboard card width
const W = 1000;
const H = 540;

// Mercator projection, sized to fit the canvas with ~5% padding around
// the visible landmasses. Clip lat extremes so Antarctica doesn't push
// everything north (Mercator's eternal complaint).
const projection = geoMercator()
  .scale(160)
  .center([0, 30])
  .translate([W / 2, H / 2]);

const pathGen = geoPath(projection);

// Pre-compute country GeoJSON from the topology (one-time at module load)
const countries = feature(
  worldData as unknown as Topology,
  (worldData as any).objects.countries
) as unknown as FeatureCollection<Geometry>;

const graticule = geoGraticule10();

const LAT_LON_DOT_LIMIT = 200;

export function DashboardGlobe({ points }: Props) {
  const [hovered, setHovered] = useState<Point | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Project every visit point into SVG coords using the same Mercator
  // as the country paths. d3 returns null if the point is outside the
  // projection's clip extent, so we filter those out.
  const projected = useMemo(() => {
    return points
      .filter(p =>
        typeof p.lat === 'number' && typeof p.lon === 'number' &&
        isFinite(p.lat) && isFinite(p.lon)
      )
      .slice(0, LAT_LON_DOT_LIMIT)
      .map(p => {
        const xy = projection([p.lon, p.lat]);
        if (!xy) return null;
        return {
          ...p,
          x: xy[0],
          y: xy[1],
          radius: Math.min(14, 4 + Math.log2((p.visits as number) + 1) * 1.6),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [points]);

  const countryPaths = useMemo(() => {
    return countries.features
      .map(f => pathGen(f))
      .filter((d): d is string => !!d);
  }, []);

  const graticulePath = useMemo(() => pathGen(graticule) || '', []);

  return (
    <div
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
          <radialGradient id="dgw-bg" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.20)" />
            <stop offset="60%" stopColor="rgba(20, 12, 40, 0.7)" />
            <stop offset="100%" stopColor="rgba(4, 2, 14, 0.95)" />
          </radialGradient>
          <radialGradient id="dgw-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd166" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ec4899" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </radialGradient>
          <filter id="dgw-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#dgw-bg)" />

        {/* Lat/lon graticule for atmosphere */}
        <path
          d={graticulePath}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="0.6"
        />

        {/* Country outlines */}
        <g>
          {countryPaths.map((d, i) => (
            <path
              key={`c-${i}`}
              d={d}
              fill="rgba(168, 85, 247, 0.20)"
              stroke="rgba(168, 85, 247, 0.55)"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Visit dots */}
        <g>
          {projected.map((p, i) => (
            <g
              key={`pt-${i}`}
              transform={`translate(${p.x}, ${p.y})`}
              onMouseEnter={() => { setHovered(p); setHoverPos({ x: p.x, y: p.y }); }}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle r={p.radius * 2.4} fill="url(#dgw-glow)" filter="url(#dgw-blur)" opacity={0.7}>
                <animate
                  attributeName="r"
                  values={`${p.radius * 2.0};${p.radius * 2.8};${p.radius * 2.0}`}
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.55;0.85;0.55"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r={p.radius * 0.45} fill="#ffd166" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
            </g>
          ))}
        </g>

        {/* Counter pill */}
        <g transform={`translate(${W - 16}, 16)`}>
          <rect
            x={-150} y={0} width={150} height={28} rx={14}
            fill="rgba(20,14,40,0.7)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"
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
          No geo-tagged visits yet. Map fills in as visits arrive.
        </div>
      )}
    </div>
  );
}
