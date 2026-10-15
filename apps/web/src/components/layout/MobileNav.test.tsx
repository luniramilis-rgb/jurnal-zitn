// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Sidebar drawer content is not under test here (its own hooks fetch) — stub it.
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => (
    <nav data-testid="drawer-nav">
      <a href="/dashboard">Dasbor</a>
    </nav>
  ),
}));

import { MobileNav } from './MobileNav';

afterEach(cleanup);

describe('MobileNav (ZITN-TECH-070 nav mobile)', () => {
  it('renders a hamburger (mobile-only) that opens the nav dialog', () => {
    render(<MobileNav />);
    expect(screen.queryByTestId('mobile-nav')).toBeNull();

    const toggle = screen.getByTestId('mobile-nav-toggle');
    expect(toggle.className).toContain('md:hidden');
    fireEvent.click(toggle);

    const dialog = screen.getByTestId('mobile-nav');
    expect(dialog).toBeTruthy();
    expect(screen.getByTestId('drawer-nav')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on Escape', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByTestId('mobile-nav-toggle'));
    expect(screen.getByTestId('mobile-nav')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-nav')).toBeNull();
  });

  it('closes on the backdrop', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByTestId('mobile-nav-toggle'));
    // Two controls carry the label (backdrop + close); the backdrop is first.
    fireEvent.click(screen.getAllByLabelText('Tutup menu')[0]);
    expect(screen.queryByTestId('mobile-nav')).toBeNull();
  });

  it('closes when a nav link is clicked (shell persists across routes)', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByTestId('mobile-nav-toggle'));
    fireEvent.click(screen.getByRole('link', { name: 'Dasbor' }));
    expect(screen.queryByTestId('mobile-nav')).toBeNull();
  });
});
