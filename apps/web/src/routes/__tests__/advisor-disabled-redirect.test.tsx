// @vitest-environment jsdom
/* eslint-disable import-x/order */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---- Mocks ----------------------------------------------------------------

// The instance posture, switchable per test. Both the hook and the route-level
// reader come from the same module so a test flips one thing.
const posture = { advisorEnabled: true };
vi.mock('@/hooks/useRegistrationEnabled', () => ({
  useAdvisorEnabled: () => posture.advisorEnabled,
  useRegistrationEnabled: () => ({ registrationEnabled: true, isPending: false }),
  isAdvisorEnabledForRoute: async () => posture.advisorEnabled,
}));

// The advisor surface itself is not under test — every hook it mounts fetches.
vi.mock('@/features/advisor/pages/AdvisorPage', () => ({
  AdvisorPage: () => <div data-testid="advisor-page" />,
}));

// Same for the options page (advisor-bound, withdrawn together with it).
vi.mock('@/features/options/components/OptionsPage', () => ({
  OptionsPage: () => <div data-testid="options-page" />,
}));

import { Route as AdvisorIndexRoute } from '../_auth.advisor.index';
import { Route as AdvisorNewRoute } from '../_auth.advisor.new';
import { Route as AdvisorIdRoute } from '../_auth.advisor.$id';
import { Route as OptionsRoute } from '../_auth.options';
import { Route as SettingsAdvisorRoute } from '../_auth.settings.advisor';

/* eslint-disable @typescript-eslint/no-explicit-any */
const indexOpts = AdvisorIndexRoute.options as any;
const newOpts = AdvisorNewRoute.options as any;
const idOpts = AdvisorIdRoute.options as any;
const optionsOpts = OptionsRoute.options as any;
const settingsAdvisorOpts = SettingsAdvisorRoute.options as any;

// ---- Test router ----------------------------------------------------------
// The real routes' `beforeLoad` and components, re-hosted under a fresh root
// with a stub dashboard (the redirect target) and a stub /settings, so the
// contract under test is only "withdrawn ⇒ redirected before the page mounts".

function buildRouter(initialPath: string) {
  const rootRoute = createRootRoute();
  const dashboard = createRoute({
    getParentRoute: () => rootRoute as any,
    path: '/dashboard',
    component: () => <div data-testid="dashboard" />,
  });
  const settings = createRoute({
    getParentRoute: () => rootRoute as any,
    path: '/settings',
    component: () => <div data-testid="settings" />,
  });
  const settingsAdvisor = createRoute({
    getParentRoute: () => rootRoute as any,
    path: '/settings/advisor',
    beforeLoad: settingsAdvisorOpts.beforeLoad,
    component: settingsAdvisorOpts.component,
  });
  const advisorIndex = createRoute({
    getParentRoute: () => rootRoute as any,
    path: '/advisor',
    beforeLoad: indexOpts.beforeLoad,
    component: indexOpts.component,
  });
  const advisorNew = createRoute({
    getParentRoute: () => rootRoute as any,
    path: '/advisor/new',
    beforeLoad: newOpts.beforeLoad,
    component: newOpts.component,
  });
  const advisorId = createRoute({
    getParentRoute: () => rootRoute as any,
    path: '/advisor/$id',
    beforeLoad: idOpts.beforeLoad,
    component: idOpts.component,
  });
  const options = createRoute({
    getParentRoute: () => rootRoute as any,
    path: '/options',
    beforeLoad: optionsOpts.beforeLoad,
    component: optionsOpts.component,
  });

  const routeTree = rootRoute.addChildren([
    dashboard,
    settings,
    settingsAdvisor,
    advisorIndex,
    advisorNew,
    advisorId,
    options,
  ]);

  return createRouter({
    routeTree: routeTree as any,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

function renderAt(initialPath: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter(initialPath);
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  posture.advisorEnabled = true;
});
afterEach(cleanup);

describe('advisor routes on an instance that withdrew the advisor', () => {
  it.each(['/advisor', '/advisor/new', '/advisor/c87b56b5-6fda-420a-ba5f-507dafa45476'])(
    '%s lands on the dashboard, and the advisor page never mounts',
    async (path) => {
      posture.advisorEnabled = false;
      const router = renderAt(path);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/dashboard');
      });
      expect(await screen.findByTestId('dashboard')).toBeTruthy();
      expect(screen.queryByTestId('advisor-page')).toBeNull();
    },
  );

  it('/settings/advisor hands off to /settings, which picks the first tab it shows', async () => {
    posture.advisorEnabled = false;
    const router = renderAt('/settings/advisor');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/settings');
    });
    expect(await screen.findByTestId('settings')).toBeTruthy();
  });

  it('is a no-op where the advisor is offered (the default)', async () => {
    const router = renderAt('/advisor/new');

    expect(await screen.findByTestId('advisor-page')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/advisor/new');
  });
});

describe('options route on an instance that withdrew the advisor (A7)', () => {
  it('/options lands on the dashboard and the options page never mounts', async () => {
    posture.advisorEnabled = false;
    const router = renderAt('/options');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard');
    });
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(screen.queryByTestId('options-page')).toBeNull();
  });

  it('renders where the advisor (and thus options) is offered', async () => {
    const router = renderAt('/options');

    expect(await screen.findByTestId('options-page')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/options');
  });
});
