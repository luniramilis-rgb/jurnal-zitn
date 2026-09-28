// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { isEditableTarget, resolveShortcut, SHORTCUT_SEQUENCES } from './useGlobalShortcuts';

describe('resolveShortcut (F6)', () => {
  it('opens help on `?` from any state', () => {
    expect(resolveShortcut(false, '?')).toEqual({ kind: 'help' });
    expect(resolveShortcut(true, '?')).toEqual({ kind: 'help' });
  });

  it('arms the prefix on a bare `g`', () => {
    expect(resolveShortcut(false, 'g')).toEqual({ kind: 'prefix' });
    expect(resolveShortcut(false, 'G')).toEqual({ kind: 'prefix' });
  });

  it('navigates to the matching route when the prefix is armed', () => {
    expect(resolveShortcut(true, 'd')).toEqual({ kind: 'navigate', path: '/dashboard' });
    expect(resolveShortcut(true, 'p')).toEqual({ kind: 'navigate', path: '/positions' });
    expect(resolveShortcut(true, 'B')).toEqual({ kind: 'navigate', path: '/playbooks' });
    expect(resolveShortcut(true, 't')).toEqual({ kind: 'navigate', path: '/trade-plans' });
  });

  it('consumes a non-matching key after the prefix, and ignores bare letters', () => {
    expect(resolveShortcut(true, 'x')).toBeNull();
    expect(resolveShortcut(false, 'd')).toBeNull();
  });

  it('has a unique key for every sequence', () => {
    const keys = SHORTCUT_SEQUENCES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('isEditableTarget (F6)', () => {
  it('is true for typing fields and contenteditable', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      expect(isEditableTarget(document.createElement(tag))).toBe(true);
    }
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    // jsdom does not reflect contentEditable; set the property directly.
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(isEditableTarget(editable)).toBe(true);
  });

  it('is false for ordinary elements and null', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
