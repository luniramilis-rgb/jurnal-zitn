// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { setAppLocale } from '@/lib/locale';

import { ExportDataSection } from './ExportDataSection';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));

const createObjectURL = vi.fn(() => 'blob:export');
const revokeObjectURL = vi.fn();
const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

beforeEach(() => {
  setAppLocale('en');
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  setAppLocale('id');
  cleanup();
  vi.clearAllMocks();
});

describe('ExportDataSection', () => {
  it('renders the export block with its button', () => {
    render(<ExportDataSection />);

    expect(screen.getByText('Export data')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download my data' })).toBeTruthy();
  });

  it('downloads the export bundle and saves it under the server filename', async () => {
    const blob = new Blob(['{"format":"jurnal-zitn-export"}'], { type: 'application/json' });
    vi.mocked(api.download).mockResolvedValue({
      blob,
      filename: 'jurnal-zitn-export-2026-09-28.json',
    });

    render(<ExportDataSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    await waitFor(() => expect(api.download).toHaveBeenCalledWith('/users/me/export'));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(blob));
    expect(anchorClick).toHaveBeenCalled();
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:export'));
  });

  it('shows the pending label and disables the button while the export is preparing', async () => {
    let resolveDownload: (value: { blob: Blob; filename: string }) => void = () => {};
    vi.mocked(api.download).mockReturnValue(
      new Promise((resolve) => {
        resolveDownload = resolve;
      }),
    );

    render(<ExportDataSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    const pending = (await screen.findByRole('button', {
      name: 'Preparing...',
    })) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);

    resolveDownload({ blob: new Blob(['{}']), filename: 'export.json' });
    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Download my data' }) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  it('surfaces an error and re-enables the button when the export fails', async () => {
    vi.mocked(api.download).mockRejectedValue(new Error('boom'));

    render(<ExportDataSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    const alert = await screen.findByTestId('export-error');
    expect(alert.textContent).toBe('Could not prepare the export. Try again.');
    const button = screen.getByRole('button', { name: 'Download my data' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
