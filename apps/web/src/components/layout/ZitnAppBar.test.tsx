// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import tokens from '@/styles/zitn-tokens.json';

import { ZitnAppBar } from './ZitnAppBar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderBar() {
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root as any,
    path: '/cek-risiko',
    component: ZitnAppBar,
  });
  const router = createRouter({
    routeTree: root.addChildren([route]) as any,
    history: createMemoryHistory({ initialEntries: ['/cek-risiko'] }),
  });
  render(<RouterProvider router={router as any} />);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

afterEach(cleanup);

describe('ZitnAppBar — shared ZITN chrome (G2, A1 · Fase H)', () => {
  it('renders the five ZITN surfaces with absolute/internal targets', async () => {
    renderBar();

    const bar = await screen.findByTestId('zitn-app-bar');
    const links = Array.from(bar.querySelectorAll('a'));
    expect(links.map((a) => a.textContent)).toEqual([
      'Beranda',
      'Pemindai',
      'Chart',
      'Cek Risiko',
      'Akun',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://zeninthenoise.com/',
      'https://zeninthenoise.com/daily/',
      'https://zeninthenoise.com/daily/chart/',
      '/cek-risiko',
      'https://zeninthenoise.com/akun/',
    ]);
    // Cek Risiko is this app's face — it reads as the current surface.
    expect(screen.getByText('Cek Risiko').getAttribute('aria-current')).toBe('page');
    // The strip carries the shared ZITN accent.
    expect(bar.getAttribute('style')).toContain('#f59e0b');
  });
});

describe('ZITN shared design tokens artifact (G2)', () => {
  it('pins the values exported from src/trutova/core/theme.py', () => {
    expect(tokens.source).toBe('src/trutova/core/theme.py');
    expect(tokens.themeColor).toBe('#0f1115');
    expect(tokens.tokens.bg).toBe('#0f1115');
    expect(tokens.tokens.card).toBe('#171a21');
    expect(tokens.tokens.line).toBe('#272c36');
    expect(tokens.tokens.ink).toBe('#e8eaee');
    expect(tokens.tokens.muted).toBe('#9aa3af');
    expect(tokens.tokens.accent).toBe('#f59e0b');
    expect(tokens.fontStack).toContain('ui-sans-serif');
    expect(Object.keys(tokens.tokens)).toHaveLength(13);
  });
});
