// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { setAppLocale } from '@/lib/locale';

import { Route as LoginRoute } from './login';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOTICE = 'Your account was deleted.';

// ZITN-TECH-029: the login mutation is stubbed so a successful submit can be
// asserted to land on the sanitized ?redirect= target.
const { loginMutate } = vi.hoisted(() => ({ loginMutate: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({
  useLogin: () => ({ mutateAsync: loginMutate, isPending: false }),
}));

// A browser history, not a memory one: login.tsx reads the deleted flag off
// window.location, so the URL under assertion has to be the real one.
/* eslint-disable @typescript-eslint/no-explicit-any */
function buildRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const make = (path: string, component: () => ReactNode) =>
    createRoute({ getParentRoute: () => rootRoute as any, path, component });
  const login = make('/login', (LoginRoute.options as any).component);
  // The form links to these; every navigation target the tests use must exist.
  const routeTree = rootRoute.addChildren([
    login,
    make('/register', () => null),
    make('/forgot-password', () => null),
    make('/dashboard', () => null),
    make('/advertising', () => null),
  ]);
  return createRouter({ routeTree: routeTree as any, history: createBrowserHistory() });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let fetchSpy: MockInstance;

beforeEach(() => {
  // Uji ini mengunci salinan berbahasa Inggris (A0: default produk = id).
  setAppLocale('en');
  loginMutate.mockReset();
  loginMutate.mockResolvedValue(undefined);
  // useRegistrationEnabled reads /config on mount; answer it so nothing throws.
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ registrationEnabled: true, advisorEnabled: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
});

afterEach(() => {
  cleanup();
  setAppLocale('id');
  fetchSpy.mockRestore();
  window.history.replaceState(null, '', '/');
});

function renderLogin() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = buildRouter();
  render(
    <QueryClientProvider client={qc}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
  return router;
}

async function fillValidCredentials() {
  await screen.findByText('Log in', { selector: '[data-slot="card-title"]' });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  // Wait for onChange validation to enable the submit button before clicking.
  await waitFor(() =>
    expect((screen.getByRole('button', { name: 'Log in' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
}

describe('login page — deleted-account notice', () => {
  it('shows a muted notice on /login?deleted=true, never text-destructive', async () => {
    window.history.replaceState(null, '', '/login?deleted=true');
    renderLogin();

    const notice = await screen.findByText(NOTICE);
    // Deletion is not an error: muted, not the expiry's destructive styling.
    expect(notice.className).toContain('text-muted-foreground');
    expect(notice.className).not.toContain('text-destructive');
  });

  it('shows no deleted notice on a plain /login', async () => {
    window.history.replaceState(null, '', '/login');
    renderLogin();

    expect(
      await screen.findByText('Log in', { selector: '[data-slot="card-title"]' }),
    ).toBeTruthy();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it('renders the Indonesian copy by default (A0/A1)', async () => {
    setAppLocale('id');
    window.history.replaceState(null, '', '/login');
    renderLogin();

    expect(await screen.findByText('Masuk', { selector: '[data-slot="card-title"]' })).toBeTruthy();
    expect(screen.getByLabelText('Kata sandi')).toBeTruthy();
    expect(screen.getByText('Lupa kata sandi?')).toBeTruthy();
  });
});

describe('login page — password visibility toggle (ZITN-TECH-029)', () => {
  it('toggles the password field between hidden and shown with an accessible pressed state', async () => {
    window.history.replaceState(null, '', '/login');
    renderLogin();

    const password = await screen.findByLabelText('Password');
    expect(password.getAttribute('type')).toBe('password');

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);
    expect(password.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe(
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password.getAttribute('type')).toBe('password');
  });
});

describe('login page — submit gating', () => {
  it('keeps the submit button disabled until email and password are valid', async () => {
    window.history.replaceState(null, '', '/login');
    renderLogin();

    const submit = await screen.findByRole('button', { name: 'Log in' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'x' } });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await fillValidCredentials();
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
  });
});

describe('login page — ZITN SSO door (ZITN-TECH-029)', () => {
  it('shows the door and the "or" divider, carrying the sanitized target', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          registrationEnabled: true,
          advisorEnabled: false,
          journalSsoEnabled: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    window.history.replaceState(null, '', '/login?redirect=%2Fadvertising');
    renderLogin();

    const link = await screen.findByRole('link', { name: 'Continue with ZITN' });
    expect(link.getAttribute('href')).toBe('/api/auth/sso/start?redirect=%2Fadvertising');
    expect(screen.getByText('or')).toBeTruthy();
  });

  it('hides the door and divider when the instance does not offer it', async () => {
    window.history.replaceState(null, '', '/login');
    renderLogin();

    await screen.findByText('Log in', { selector: '[data-slot="card-title"]' });
    expect(screen.queryByRole('link', { name: 'Continue with ZITN' })).toBeNull();
    expect(screen.queryByText('or')).toBeNull();
  });
});

describe('login page — ?redirect= sanitisation', () => {
  it('lands on a local redirect target after a successful login', async () => {
    window.history.replaceState(null, '', '/login?redirect=%2Fadvertising');
    const router = renderLogin();
    await fillValidCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/advertising'));
  });

  it.each([
    ['https://evil.example', 'absolute URL'],
    ['%2F%2Fevil.example', 'protocol-relative'],
    ['javascript%3Aalert(1)', 'javascript scheme'],
  ])('falls back to /dashboard for an unsafe redirect (%s)', async (redirect) => {
    window.history.replaceState(null, '', `/login?redirect=${redirect}`);
    const router = renderLogin();
    await fillValidCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });
});
