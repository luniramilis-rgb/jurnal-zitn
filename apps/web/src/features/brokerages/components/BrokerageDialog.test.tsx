// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrokerageDialog } from './BrokerageDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom lacks the Pointer Capture APIs Radix's Select calls on open; stub them so
// the menu can be driven with user-event.
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.scrollIntoView = () => {};

const createMutate = vi.fn().mockResolvedValue({});
const noopMutate = vi.fn().mockResolvedValue({});

vi.mock('../hooks/useBrokerages', () => ({
  useCreateBrokerage: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateBrokerage: () => ({ mutateAsync: noopMutate, isPending: false }),
  useDuplicateBrokerage: () => ({ mutateAsync: noopMutate, isPending: false }),
  useBrokeragePositionCount: () => ({ data: { count: 0 } }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BrokerageDialog — preset broker IDX (D3)', () => {
  it('applies a preset to the form and creates the brokerage already configured', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<BrokerageDialog open onOpenChange={() => {}} />);

    await user.click(screen.getByRole('combobox', { name: 'Preset broker IDX' }));
    await user.click(await screen.findByRole('option', { name: 'Mirae Asset Sekuritas' }));

    // The preset fills the name; the fee values are what the submit must carry.
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Mirae Asset Sekuritas');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mirae Asset Sekuritas',
          feeSchedule: expect.objectContaining({
            stockPercentBuy: '0.15',
            stockPercentSell: '0.25',
          }),
        }),
      ),
    );
    // The disclaimer travels in notes so it survives as the user's own record.
    const payload = createMutate.mock.calls[0][0] as { notes: string };
    expect(payload.notes).toContain('Perkiraan komisi');
  });

  it('offers every shipped IDX preset', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<BrokerageDialog open onOpenChange={() => {}} />);

    await user.click(screen.getByRole('combobox', { name: 'Preset broker IDX' }));

    for (const name of [
      'Mirae Asset Sekuritas',
      'Stockbit Sekuritas',
      'Sinarmas Sekuritas',
      'BNI Sekuritas',
      'Indo Premier Sekuritas',
    ]) {
      expect(await screen.findByRole('option', { name })).toBeTruthy();
    }
  });
});
