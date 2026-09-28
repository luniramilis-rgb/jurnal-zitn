// @vitest-environment jsdom
//
// FeedbackSurface after the F0b rewire (ZITN-TECH-017 §10.4): the surface is
// always available (no survey-config gate), a submission goes to our own
// POST /api/feedback via useSubmitFeedback, and NO PostHog capture fires — the
// telemetry spies below must stay at zero across every path.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  captureFeedbackDismissed,
  captureFeedbackSent,
  captureFeedbackShown,
} from '@/lib/telemetry/posthog';
import { useDrawerStore } from '@/stores/drawer.store';

import { useSubmitFeedback } from '../hooks/useSubmitFeedback';

import { FeedbackSurface, feedbackMainGutterClasses, SENT_STATE_DWELL_MS } from './FeedbackSurface';

// The telemetry seam this slice USED to touch. Kept mocked so the test can prove
// nothing calls it any more (F0b: rewired off PostHog).
vi.mock('@/lib/telemetry/posthog', () => ({
  captureFeedbackShown: vi.fn(),
  captureFeedbackSent: vi.fn(),
  captureFeedbackDismissed: vi.fn(),
  FEEDBACK_TEXT_MAX_LENGTH: 2000,
}));

vi.mock('../hooks/useSubmitFeedback', () => ({ useSubmitFeedback: vi.fn() }));

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn(() => false) }));

type Mutation = ReturnType<typeof useSubmitFeedback>;

let mutate: ReturnType<typeof vi.fn>;

const shown = vi.mocked(captureFeedbackShown);
const sent = vi.mocked(captureFeedbackSent);
const dismissed = vi.mocked(captureFeedbackDismissed);

function setMobile(mobile: boolean) {
  vi.mocked(useMediaQuery).mockReturnValue(mobile);
}

beforeEach(() => {
  vi.mocked(useMediaQuery).mockReset();
  setMobile(false);
  shown.mockReset();
  sent.mockReset();
  dismissed.mockReset();
  mutate = vi.fn();
  vi.mocked(useSubmitFeedback).mockReturnValue({
    mutate,
    isPending: false,
  } as unknown as Mutation);
  useDrawerStore.setState({
    isOpen: false,
    activeTab: 'open-positions',
    legacyDetected: false,
    inspectedPosition: null,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const tab = () => screen.getByTestId('feedback-tab');

async function fillAndSend(ratingType = 'Bug', message = 'sepuluh karakter lebih') {
  const user = userEvent.setup();
  await user.click(tab());
  await user.click(screen.getByRole('radio', { name: ratingType }));
  await user.type(screen.getByRole('textbox'), message);
  await user.click(screen.getByRole('button', { name: 'Send' }));
  return user;
}

describe('FeedbackSurface — always available, off PostHog', () => {
  it('renders the tab without any survey-config gate and always yields gutter classes', () => {
    render(<FeedbackSurface />);
    expect(tab()).toBeTruthy();
    expect(tab().getAttribute('aria-label')).toBe('Send feedback');
    expect(typeof feedbackMainGutterClasses(false)).toBe('string');
    expect(feedbackMainGutterClasses(false).length).toBeGreaterThan(0);
  });

  it('opens the popover and never calls PostHog', async () => {
    const user = userEvent.setup();
    render(<FeedbackSurface />);
    await user.click(tab());
    expect(screen.getByTestId('feedback-popover')).toBeTruthy();
    expect(shown).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();
    expect(dismissed).not.toHaveBeenCalled();
  });
});

describe('FeedbackSurface — submission goes to our API', () => {
  it('sends { type, message, pageUrl, source } to the mutation and shows the sent state', async () => {
    render(<FeedbackSurface />);
    await fillAndSend('Feature', 'Ini pesan umpan balik yang cukup panjang');

    expect(mutate).toHaveBeenCalledTimes(1);
    const [body] = mutate.mock.calls[0];
    expect(body).toMatchObject({
      type: 'feature',
      message: 'Ini pesan umpan balik yang cukup panjang',
      source: 'jurnal',
    });
    expect(typeof body.pageUrl).toBe('string');
    expect(sent).not.toHaveBeenCalled();

    // Resolve the request: the parent's onSuccess shows the sent state.
    const options = mutate.mock.calls[0][1] as { onSuccess?: () => void };
    act(() => options.onSuccess?.());
    expect(screen.getByText('Sent. Thank you.')).toBeTruthy();
    expect(sent).not.toHaveBeenCalled();
  });

  it('shows an inline error when the request fails', async () => {
    render(<FeedbackSurface />);
    await fillAndSend('Bug', 'Pesan bug yang cukup panjang');

    const options = mutate.mock.calls[0][1] as { onError?: () => void };
    act(() => options.onError?.());
    expect(screen.getByRole('alert').textContent).toContain('Failed to send');
  });

  it('auto-closes the sent state after the dwell, with no capture', () => {
    vi.useFakeTimers();
    render(<FeedbackSurface />);
    fireEvent.click(tab());
    fireEvent.click(screen.getByRole('radio', { name: 'Question' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Pertanyaan yang cukup panjang' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    const options = mutate.mock.calls[0][1] as { onSuccess?: () => void };
    act(() => options.onSuccess?.());
    act(() => {
      vi.advanceTimersByTime(SENT_STATE_DWELL_MS);
    });

    expect(screen.queryByTestId('feedback-popover')).toBeNull();
    expect(sent).not.toHaveBeenCalled();
    expect(dismissed).not.toHaveBeenCalled();
  });
});

describe('FeedbackSurface — drawer-follow', () => {
  it('closes the popover on a drawerOpen flip while open, with no capture', async () => {
    const user = userEvent.setup();
    render(<FeedbackSurface />);
    await user.click(tab());
    act(() => {
      useDrawerStore.setState({ isOpen: true });
    });
    await waitFor(() => expect(screen.queryByTestId('feedback-popover')).toBeNull());
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('hides the tab and closes on a mobile flip with the drawer open', async () => {
    act(() => {
      useDrawerStore.setState({ isOpen: true });
    });
    setMobile(false);
    const user = userEvent.setup();
    const { rerender } = render(<FeedbackSurface />);
    await user.click(tab());

    setMobile(true);
    rerender(<FeedbackSurface />);
    await waitFor(() => expect(screen.queryByTestId('feedback-popover')).toBeNull());
    expect(dismissed).not.toHaveBeenCalled();
  });
});
