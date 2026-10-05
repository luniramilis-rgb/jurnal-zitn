// @vitest-environment jsdom
//
// The app used to link out to the external Tradr documentation host from the
// sidebar. During the ZITN rebrand that link is hidden (frontendFlags.
// DOCS_LINKS_ENABLED = false) but the code is kept so it can be restored by
// flipping the flag. These assert the sidebar exposes no docs link while hidden.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
setAppLocale('en');

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'someone@example.com', isAdmin: false } }),
}));

// The instance posture (GET /api/config) is a useQuery; irrelevant here.
vi.mock('@/hooks/useRegistrationEnabled', () => ({
  useAdvisorEnabled: () => true,
}));

vi.mock('@/features/changelog/hooks/useChangelog', () => ({
  useChangelogReleases: () => ({ data: undefined }),
  hasNewReleases: () => false,
}));

// The pin preference is a useQuery + useMutation pair under the hood; pin the
// mock EXPANDED so the label-text assertions below read the visible nav.
vi.mock('@/features/onboarding/hooks/useSidebarPin', () => ({
  useSidebarPin: () => ({ pinned: true, setPinned: () => {} }),
}));

vi.mock('@/components/layout/ThemeToggle', () => ({ ThemeToggle: () => null }));

// The stored reporting timezone is a useQuery; stub it so the sidebar mounts
// standalone.
vi.mock('@/hooks/useUserTimezone', () => ({
  useUserTimezone: () => 'America/New_York',
}));

import { DOCS_BASE_URL } from '@/lib/docs';
import { setAppLocale } from '@/lib/locale';

import { Sidebar } from './Sidebar';

function mountWith(ui: React.ReactElement): { container: HTMLElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

function unmount(container: HTMLElement, root: Root): void {
  act(() => {
    root.unmount();
  });
  container.remove();
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('Sidebar — documentation link hidden (ZITN rebrand)', () => {
  it('renders no link to the external Tradr documentation host', () => {
    const { container, root } = mountWith(<Sidebar />);

    const link = Array.from(container.querySelectorAll('nav a')).find((a) =>
      a.getAttribute('href')?.startsWith(DOCS_BASE_URL),
    );

    expect(link).toBeUndefined();

    unmount(container, root);
  });

  it('renders no "Docs" nav entry at all', () => {
    const { container, root } = mountWith(<Sidebar />);

    const docs = Array.from(container.querySelectorAll('nav a')).find(
      (a) => a.getAttribute('aria-label') === 'Docs',
    );

    expect(docs).toBeUndefined();

    unmount(container, root);
  });
});
