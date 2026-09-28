import { useCallback, useEffect, useRef, useState } from 'react';

import type { FeedbackType } from '@jurnal-zitn/shared';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useT } from '@/hooks/useLocale';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer.store';

import {
  FEEDBACK_MAIN_GUTTER,
  FEEDBACK_MAIN_GUTTER_DRAWER_OPEN,
  FEEDBACK_TAB_WIDTH_CLASSES,
} from '../geometry';
import { useSubmitFeedback } from '../hooks/useSubmitFeedback';

import { FeedbackForm } from './FeedbackForm';

// How long the "Sent. Thank you." state dwells before the popover auto-closes.
export const SENT_STATE_DWELL_MS = 3000;

/**
 * FeedbackSurface — the right-edge tab, the popover shell and the drawer-follow
 * (ZITN-TECH-017 §10.4, F0b).
 *
 * Rewired OFF PostHog: there is no survey-config gate and no capture call. The
 * surface is always available to a signed-in user, and a submission goes to our
 * own `POST /api/feedback` (login required) with the page URL captured from the
 * browser. `features/feedback`'s UI is otherwise retained.
 */
export function FeedbackSurface() {
  return <FeedbackSurfaceInner />;
}

function FeedbackSurfaceInner() {
  const t = useT();
  const drawerOpen = useDrawerStore((s) => s.isOpen);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const submit = useSubmitFeedback();

  // Controlled popover open state. `formKey` remounts the form per open so its
  // local input and double-submit guard reset for free.
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dwellTimerRef = useRef<number | null>(null);

  const closePopover = useCallback(() => {
    if (dwellTimerRef.current !== null) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    setOpen(false);
    setSent(false);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setFormKey((key) => key + 1);
        setSent(false);
        setError(null);
        setOpen(true);
      } else {
        closePopover();
      }
    },
    [closePopover],
  );

  const handleSend = useCallback(
    (type: FeedbackType, message: string) => {
      setError(null);
      // `source` tells the admin inbox which surface sent it: the daily-sheet
      // page (`/lembar`) sends 'lembar', every other authenticated surface sends
      // 'jurnal'. The surface is mounted once in the auth layout, so the current
      // path is the discriminator.
      const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
      submit.mutate(
        {
          type,
          message,
          pageUrl: typeof window === 'undefined' ? '' : window.location.href,
          source: pathname.startsWith('/lembar') ? 'lembar' : 'jurnal',
        },
        {
          onSuccess: () => {
            setSent(true);
            dwellTimerRef.current = window.setTimeout(() => {
              dwellTimerRef.current = null;
              closePopover();
            }, SENT_STATE_DWELL_MS);
          },
          onError: () => {
            setError(t('feedback.form.error'));
          },
        },
      );
    },
    [submit, t, closePopover],
  );

  // Drawer-change effect: close the popover on ANY drawerOpen flip while open,
  // and when (isMobile && drawerOpen) becomes true — a resize crossing below md
  // with the drawer open.
  const prevDrawerOpenRef = useRef(drawerOpen);
  const prevIsMobileRef = useRef(isMobile);
  useEffect(() => {
    const prevDrawerOpen = prevDrawerOpenRef.current;
    const prevIsMobile = prevIsMobileRef.current;
    prevDrawerOpenRef.current = drawerOpen;
    prevIsMobileRef.current = isMobile;

    const drawerFlipped = drawerOpen !== prevDrawerOpen;
    const becameMobileWithDrawerOpen = isMobile && drawerOpen && !(prevIsMobile && prevDrawerOpen);

    if (drawerFlipped || becameMobileWithDrawerOpen) {
      closePopover();
    }
  }, [drawerOpen, isMobile, closePopover]);

  // Clear a pending dwell timer on unmount.
  useEffect(() => {
    return () => {
      if (dwellTimerRef.current !== null) clearTimeout(dwellTimerRef.current);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="feedback-tab"
          aria-label={t('feedback.tab')}
          aria-expanded={open}
          className={cn(
            'fixed top-1/2 right-0 z-40 -translate-y-1/2',
            'flex items-center justify-center rounded-l-md border bg-background py-3',
            'text-muted-foreground transition-transform duration-200 ease-out',
            'cursor-pointer outline-none hover:text-foreground motion-reduce:duration-0',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            FEEDBACK_TAB_WIDTH_CLASSES,
            drawerOpen && 'max-md:hidden md:-translate-x-[360px]',
          )}
        >
          <span className="font-mono text-xs [writing-mode:vertical-rl]">feedback</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-testid="feedback-popover"
        side="left"
        align="center"
        sideOffset={8}
        className="w-80"
      >
        <FeedbackForm
          key={formKey}
          sent={sent}
          submitting={submit.isPending}
          error={error}
          onSend={handleSend}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * The <main> gutter classes for the tab. The surface is always present now (no
 * survey-config gate), so <main> always reserves the tab's width.
 */
export function feedbackMainGutterClasses(drawerOpen: boolean): string {
  return cn(FEEDBACK_MAIN_GUTTER, drawerOpen && FEEDBACK_MAIN_GUTTER_DRAWER_OPEN);
}
