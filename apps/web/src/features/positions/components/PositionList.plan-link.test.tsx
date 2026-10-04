// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makePosition } from '@/features/positions/__fixtures__/position-fixtures';
import { usePositions } from '@/features/positions/hooks/usePositions';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Fixed ids for the 1:1 plan↔position link (F4).
const { POSITION_ID, PLAN_ID } = vi.hoisted(() => ({
  POSITION_ID: '11111111-1111-1111-1111-111111111111',
  PLAN_ID: '22222222-2222-2222-2222-222222222222',
}));

// Stub the router <Link> with a plain anchor — no router context needed.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

vi.mock('@/features/tags/hooks/useTags', () => ({ useTags: () => ({ data: [] }) }));
vi.mock('@/features/accounts/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [{ id: 'a1' }] }),
}));
vi.mock('@/features/positions/hooks/usePositions', () => ({ usePositions: vi.fn() }));
vi.mock('@/lib/telemetry/posthog', () => ({ captureClientEvent: vi.fn() }));
vi.mock('./PositionRowActions', () => ({ PositionRowActions: () => null }));
vi.mock('./CreatePositionDialog', () => ({ CreatePositionDialog: () => null }));

// One plan linked 1:1 to the row below.
vi.mock('@/features/trade-plans/hooks/useTradePlans', () => ({
  useTradePlans: () => ({ data: { items: [{ id: PLAN_ID, positionId: POSITION_ID }] } }),
}));

import { PositionList } from './PositionList';

type PositionsResult = ReturnType<typeof usePositions>;

function mountWith(ui: React.ReactElement): { container: HTMLElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('PositionList — tautan balik ke Rencana Pra-Trade', () => {
  it('baris dengan rencana tertaut menampilkan tautan ke /trade-plans?focus=<id>', () => {
    vi.mocked(usePositions).mockReturnValue({
      data: [makePosition({ id: POSITION_ID })],
      isLoading: false,
    } as unknown as PositionsResult);

    const { container, root } = mountWith(<PositionList />);
    const link = container.querySelector(`a[href="/trade-plans?focus=${PLAN_ID}"]`);
    expect(link).not.toBeNull();
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('tanpa rencana tertaut, tidak ada tautan Rencana', () => {
    vi.mocked(usePositions).mockReturnValue({
      data: [makePosition({ id: '33333333-3333-3333-3333-333333333333' })],
      isLoading: false,
    } as unknown as PositionsResult);

    const { container, root } = mountWith(<PositionList />);
    expect(container.querySelector(`a[href="/trade-plans?focus=${PLAN_ID}"]`)).toBeNull();
    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
