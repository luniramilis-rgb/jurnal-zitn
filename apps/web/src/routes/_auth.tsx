import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';

import { DrawerToggleRefProvider } from '@/components/layout/DrawerToggleRefContext';
import { GlobalShortcuts } from '@/components/layout/GlobalShortcuts';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { SideDrawer } from '@/components/layout/SideDrawer';
import { ZitnAppBar } from '@/components/layout/ZitnAppBar';
import {
  FeedbackSurface,
  feedbackMainGutterClasses,
} from '@/features/feedback/components/FeedbackSurface';
import { DemoBanner } from '@/features/onboarding/components/DemoBanner';
import { ContextStrip } from '@/features/workspace/components/ContextStrip';
import { useAuth } from '@/hooks/useAuth';
import { useReportingTimezoneBackfill } from '@/hooks/useUserTimezone';
import { hardRedirectToLogin } from '@/lib/auth-redirect';
import { isPrunedPath } from '@/lib/prunedSurfaces';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer.store';
import { EventBusBridge } from '@/stores/EventBusBridge';

function AuthLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  // The drawer is a fixed overlay; on the wide, backdrop-less viewports the
  // content yields its width instead of disappearing beneath it (the mock's
  // browse→inspect frame). One state change drives the drawer, the rail's
  // auto-collapse, and this padding, so the width settles in a single reflow.
  const drawerOpen = useDrawerStore((s) => s.isOpen);
  // One-time seeding of a pre-migration reporting timezone. Here because this
  // is the one component every authenticated view mounts under, and exactly
  // once. It returns nothing and gates nothing — the early returns below run
  // whether or not it has anything to do.
  useReportingTimezoneBackfill();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // G1 (D-G1): a FULL-PAGE load so production nginx 302s /login to ZITN's
      // SSO entry; in dev/e2e the SPA's own /login form is the fallback.
      hardRedirectToLogin();
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DrawerToggleRefProvider>
      <div className="flex min-h-dvh">
        <EventBusBridge />
        <Sidebar />
        <main
          className={cn(
            'flex-1 p-4 transition-[padding] duration-200 ease-out motion-reduce:duration-0 sm:p-6',
            'app-main-safe',
            drawerOpen && 'lg:pr-[384px]',
            feedbackMainGutterClasses(drawerOpen),
          )}
        >
          {/* ZITN-TECH-070 (nav mobile): di bawah `md` rail disembunyikan dan
              navigasi dibuka dari tombol menu ini. */}
          <MobileNav />
          {/* G2 (A1): the shared ZITN chrome — a top strip above the journal's
              own sidebar, so the feature navigation stays intact. */}
          <ZitnAppBar />
          {/* Sample data reaches every derived surface in the app, so the notice
              saying so is mounted HERE rather than on the dashboard — one
              mount, above every route's content, and no page can render
              invented figures without it. The notice is app-wide and persistent
              for exactly that reason, and it carries the action that removes the
              data. It renders nothing at all when there is no sample data. */}
          <ContextStrip />
          <DemoBanner />
          <Outlet />
        </main>
        <SideDrawer />
        <FeedbackSurface />
        <GlobalShortcuts />
      </div>
    </DrawerToggleRefProvider>
  );
}

export const Route = createFileRoute('/_auth')({
  // ZITN-TECH-070 Fase 3 (hide): permukaan yang dipangkas tidak dapat dibuka lewat URL
  // langsung/bookmark; redirect terpusat di sini (reversibel lewat `frontendFlags`).
  beforeLoad: ({ location }) => {
    if (isPrunedPath(location.pathname)) throw redirect({ to: '/dashboard' });
  },
  component: AuthLayout,
});
