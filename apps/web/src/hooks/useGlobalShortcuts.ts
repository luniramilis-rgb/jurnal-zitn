import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import type { MessageKey } from '@jurnal-zitn/shared';

// ---------------------------------------------------------------------------
// F6 — global keyboard shortcuts (ZITN-TECH-017 §10.9). Two-key "g <letter>"
// navigation plus `?` for the help dialog. The resolver is a pure function so it
// can be unit-tested without a router; the hook is the thin DOM binding.
//
// Shortcuts are inert while the user is typing (input/textarea/select/
// contenteditable) and when a modifier is held, so they never fight the form.
// ---------------------------------------------------------------------------

export const SHORTCUT_SEQUENCES = [
  { key: 'd', path: '/dashboard', labelKey: 'shortcut.dashboard' },
  { key: 'p', path: '/positions', labelKey: 'shortcut.positions' },
  { key: 'b', path: '/playbooks', labelKey: 'shortcut.playbooks' },
  { key: 't', path: '/trade-plans', labelKey: 'shortcut.tradePlans' },
  { key: 'c', path: '/calculator', labelKey: 'shortcut.calculator' },
  { key: 'r', path: '/performance', labelKey: 'shortcut.performance' },
  { key: 's', path: '/settings', labelKey: 'shortcut.settings' },
] as const satisfies readonly { key: string; path: string; labelKey: MessageKey }[];

export type ShortcutPath = (typeof SHORTCUT_SEQUENCES)[number]['path'];

export type ShortcutAction =
  | { kind: 'navigate'; path: ShortcutPath }
  | { kind: 'help' }
  | { kind: 'prefix' }
  | null;

/** How long a lone `g` waits for its second key before resetting. */
export const SHORTCUT_PREFIX_TIMEOUT_MS = 1500;

/**
 * Pure resolver: given whether a `g` prefix is armed and the key pressed,
 * decide what to do. `?` always opens help; with a prefix armed, a matching
 * letter navigates (and anything else is consumed); a bare `g` arms the prefix.
 */
export function resolveShortcut(pending: boolean, key: string): ShortcutAction {
  if (key === '?') return { kind: 'help' };
  if (pending) {
    const match = SHORTCUT_SEQUENCES.find((s) => s.key === key.toLowerCase());
    return match ? { kind: 'navigate', path: match.path } : null;
  }
  if (key.toLowerCase() === 'g') return { kind: 'prefix' };
  return null;
}

/** True when the event target is a field the user is typing into. */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useGlobalShortcuts({ onHelp }: { onHelp: () => void }): void {
  const navigate = useNavigate();
  const pendingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const action = resolveShortcut(pendingRef.current, event.key);

      if (action === null) {
        // A non-matching key after `g` simply cancels the prefix.
        pendingRef.current = false;
        return;
      }

      event.preventDefault();
      switch (action.kind) {
        case 'help':
          pendingRef.current = false;
          onHelp();
          break;
        case 'prefix':
          pendingRef.current = true;
          if (timerRef.current !== null) clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            pendingRef.current = false;
            timerRef.current = null;
          }, SHORTCUT_PREFIX_TIMEOUT_MS);
          break;
        case 'navigate':
          pendingRef.current = false;
          if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          void navigate({ to: action.path });
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [navigate, onHelp]);
}
