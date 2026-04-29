// ════════════════════════════════════════════════════════════════
// PERSONA PICKER — mid-conversation voice switcher (mobile-first)
// ════════════════════════════════════════════════════════════════
// A small avatar of the CURRENT persona renders next to the chat
// send button. Tapping it opens a bottom sheet with all 20 personas
// in a 4-column grid. Tapping any persona sets them as the active
// voice for the next reply, dismisses the sheet, and gives haptic
// feedback on supported platforms.
//
// Discoverability:
//   - Subtle "tap to switch" tooltip shows on first chat session
//     (gated by localStorage flag; fades after 5s)
//   - Long-press the persona NAME in the chat header also opens it
//     (handled by Chat.tsx, not this component)
//
// Mobile budget: the sheet rises ABOVE the keyboard. The 4-col grid
// gives ~88px touch targets on a 390px viewport. iOS bottom-sheet
// style with rounded top corners + drag handle.
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { PERSONAS } from '../lib/personas';
import './PersonaPicker.css';

type Props = {
  /** Current voice — the persona answering right now. */
  currentPersonaId: string;
  /** Called when the user picks a different persona. */
  onPick: (personaId: string) => void;
  /** Optional: messages-per-persona counts to show "talked to" hints. */
  countByPersona?: Record<string, number>;
};

export function PersonaPicker({ currentPersonaId, onPick, countByPersona }: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

  const current = PERSONAS.find(p => p.id === currentPersonaId) || PERSONAS[0];

  // First-session discovery hint
  useEffect(() => {
    const seen = localStorage.getItem('mvo:picker-hint-seen');
    if (seen) return;
    const t = window.setTimeout(() => setShowHint(true), 1200);
    const t2 = window.setTimeout(() => {
      setShowHint(false);
      localStorage.setItem('mvo:picker-hint-seen', '1');
    }, 7000);
    return () => { window.clearTimeout(t); window.clearTimeout(t2); };
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function open_() {
    setOpen(true);
    setClosing(false);
    setShowHint(false);
    localStorage.setItem('mvo:picker-hint-seen', '1');
  }

  function close() {
    if (!open || closing) return;
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 240);
  }

  function pick(id: string) {
    if (id !== currentPersonaId) {
      // Haptic tick on supported platforms
      try { (navigator as any).vibrate?.(10); } catch {}
    }
    onPick(id);
    close();
  }

  // Drag-to-dismiss on the sheet handle
  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = e.changedTouches[0].clientY - dragStartY.current;
    sheetRef.current.style.transform = '';
    dragStartY.current = null;
    if (dy > 80) close();
  }

  return (
    <>
      {/* Trigger — sits next to send button */}
      <button
        type="button"
        className="pp-trigger"
        onClick={open_}
        aria-label={`Switch persona — currently ${current.name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          '--pp-accent': current.accent,
          '--pp-accent-rgb': current.accentRgb,
        } as React.CSSProperties}
      >
        <span className="pp-trigger-glyph">{current.glyph}</span>
        <span className="pp-trigger-chevron" aria-hidden="true">▾</span>
        {showHint && (
          <span className="pp-hint" role="tooltip">
            Tap to switch who answers
          </span>
        )}
      </button>

      {/* Bottom sheet */}
      {open && (
        <div
          className={`pp-overlay ${closing ? 'pp-closing' : 'pp-opening'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Pick a persona"
          onClick={close}
        >
          <div
            ref={sheetRef}
            className="pp-sheet"
            onClick={e => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="pp-handle" aria-hidden="true" />

            <div className="pp-header">
              <h3 className="pp-title">Who answers next?</h3>
              <button
                type="button"
                className="pp-close"
                onClick={close}
                aria-label="Close persona picker"
              >×</button>
            </div>

            <div className="pp-grid" role="listbox" aria-label="Personas">
              {PERSONAS.map(p => {
                const isCurrent = p.id === currentPersonaId;
                const count = countByPersona?.[p.id] || 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    className={`pp-cell${isCurrent ? ' pp-cell-current' : ''}`}
                    onClick={() => pick(p.id)}
                    style={{
                      '--cell-accent': p.accent,
                      '--cell-accent-rgb': p.accentRgb,
                    } as React.CSSProperties}
                  >
                    {p.ageGate && <span className="pp-cell-age">{p.ageGate}</span>}
                    <span className="pp-cell-glyph">{p.glyph}</span>
                    <span className="pp-cell-name">{p.name}</span>
                    <span className="pp-cell-tag">{p.tag}</span>
                    {count > 0 && (
                      <span className="pp-cell-count" aria-label={`${count} messages so far`}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                    {isCurrent && <span className="pp-cell-active-dot" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <div className="pp-footer">
              <span className="pp-footer-text">
                Same conversation. Different voice. Each persona remembers everything.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
