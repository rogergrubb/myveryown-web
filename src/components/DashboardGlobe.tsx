// ════════════════════════════════════════════════════════════════
// DASHBOARD GLOBE — 3D earth with dots per visitor location
// ════════════════════════════════════════════════════════════════
// Lazy-loaded by Dashboard.tsx so the globe.gl + three bundle (~1MB)
// doesn't end up in the main app payload.
//
// API NOTE: globe.gl exports a factory function (NOT a constructor).
// Correct usage:
//     const g = Globe();
//     g(domElement)
//       .globeImageUrl(...)
//       .pointsData(...);
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useMemo } from 'react';
import Globe from 'globe.gl';

type Point = { lat: number; lon: number; city: string | null; country: string | null; visits: number };

type Props = { points: Point[] };

export function DashboardGlobe({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => points.filter(p =>
    typeof p.lat === 'number' && typeof p.lon === 'number' &&
    isFinite(p.lat) && isFinite(p.lon)
  ), [points]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    let g: any;
    try {
      // Factory + DOM-attach — NOT `new Globe(...)`
      g = (Globe as any)();
      g(el);
    } catch (err) {
      console.error('[globe] failed to mount', err);
      el.innerHTML = '<div style="color: rgba(240,237,232,0.5); padding: 40px; text-align: center; font-family: Sora, sans-serif; font-size: 0.85rem;">Globe failed to load. (Visit data still flows in below.)</div>';
      return;
    }

    try {
      g
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('rgba(168, 85, 247, 0.7)')
        .atmosphereAltitude(0.18)
        // Earth night texture from globe.gl's example assets
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .pointsData(data)
        .pointLat((d: any) => d.lat)
        .pointLng((d: any) => d.lon)
        .pointAltitude(0.005)
        .pointRadius((d: any) => Math.min(1.6, 0.25 + Math.log2((d.visits as number) + 1) * 0.18))
        .pointColor(() => '#ffd166')
        .pointLabel((d: any) => `
          <div style="
            font-family:'Sora',sans-serif;font-size:0.78rem;
            padding:8px 12px;background:rgba(20,14,40,0.95);
            border:1px solid rgba(255,255,255,0.18);border-radius:8px;
            color:#fff;backdrop-filter:blur(8px);box-shadow:0 6px 24px rgba(0,0,0,0.5);
          ">
            <div style="font-weight:700;color:#ffd166">${d.city || '—'}${d.country ? ' · ' + d.country : ''}</div>
            <div style="opacity:0.65;font-size:0.7rem;margin-top:2px">${d.visits} visit${d.visits === 1 ? '' : 's'}</div>
          </div>`);
    } catch (err) {
      console.error('[globe] config failed', err);
    }

    const resize = () => {
      const w = el.clientWidth;
      const h = Math.min(560, Math.max(320, w * 0.6));
      try { g.width(w).height(h); } catch {}
    };
    resize();
    window.addEventListener('resize', resize);

    try {
      const controls: any = g.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.enableZoom = true;
      }
    } catch {}

    try { g.pointOfView({ lat: 28, lng: -50, altitude: 2.5 }, 1200); } catch {}

    return () => {
      window.removeEventListener('resize', resize);
      try { g._destructor?.(); } catch {}
      try { el.innerHTML = ''; } catch {}
    };
  }, [data]);

  return <div ref={containerRef} className="dash-globe" style={{ width: '100%', minHeight: 320 }} />;
}
