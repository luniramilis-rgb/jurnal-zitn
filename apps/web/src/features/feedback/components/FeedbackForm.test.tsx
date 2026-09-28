// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FEEDBACK_MESSAGE_MAX } from '@jurnal-zitn/shared';

import { setAppLocale } from '@/lib/locale';

import { FeedbackForm } from './FeedbackForm';

beforeEach(() => setAppLocale('en'));
afterEach(() => {
  setAppLocale('id');
  cleanup();
});

function sendButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;
}

function messageBox(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
}

describe('FeedbackForm (F0b — type + message)', () => {
  it('disables Send until a type is chosen AND the message is at least 10 characters', () => {
    render(<FeedbackForm sent={false} submitting={false} error={null} onSend={vi.fn()} />);
    expect(sendButton().disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Bug' }));
    expect(sendButton().disabled).toBe(true); // no message yet

    fireEvent.change(messageBox(), { target: { value: 'short' } });
    expect(sendButton().disabled).toBe(true);
    expect(screen.getByText('Message must be at least 10 characters.')).toBeTruthy();

    fireEvent.change(messageBox(), { target: { value: 'a long enough message' } });
    expect(sendButton().disabled).toBe(false);
  });

  it('sends the trimmed { type, message } exactly once under double activation', () => {
    const onSend = vi.fn();
    render(<FeedbackForm sent={false} submitting={false} error={null} onSend={onSend} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Feature' }));
    fireEvent.change(messageBox(), { target: { value: '  sebuah pesan yang panjang  ' } });

    const send = sendButton();
    fireEvent.click(send);
    fireEvent.click(send);

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('feature', 'sebuah pesan yang panjang');
  });

  it('shows the remaining-character counter only under 200 remaining', () => {
    render(<FeedbackForm sent={false} submitting={false} error={null} onSend={vi.fn()} />);
    expect(screen.queryByText(/characters remaining/)).toBeNull();

    fireEvent.change(messageBox(), { target: { value: 'a'.repeat(FEEDBACK_MESSAGE_MAX - 199) } });
    expect(screen.getByText('199 characters remaining')).toBeTruthy();

    fireEvent.change(messageBox(), { target: { value: 'a'.repeat(FEEDBACK_MESSAGE_MAX - 200) } });
    expect(screen.queryByText(/characters remaining/)).toBeNull();
  });

  it('shows the inline error and re-enables a retry', () => {
    render(
      <FeedbackForm
        sent={false}
        submitting={false}
        error="Failed to send. Try again."
        onSend={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Failed to send');
  });

  it('resets local state on a new key (reopen)', () => {
    const { rerender } = render(
      <FeedbackForm key="open-1" sent={false} submitting={false} error={null} onSend={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'General' }));
    fireEvent.change(messageBox(), { target: { value: 'pesan pertama yang panjang' } });

    rerender(
      <FeedbackForm key="open-2" sent={false} submitting={false} error={null} onSend={vi.fn()} />,
    );
    for (const label of ['Bug', 'Feature', 'General', 'Question']) {
      expect(screen.getByRole('radio', { name: label }).getAttribute('aria-checked')).toBe('false');
    }
    expect(messageBox().value).toBe('');
    expect(sendButton().disabled).toBe(true);
  });

  it('swaps to the sent acknowledgement when sent is true', () => {
    const { rerender } = render(
      <FeedbackForm sent={false} submitting={false} error={null} onSend={vi.fn()} />,
    );
    expect(screen.queryByText('Sent. Thank you.')).toBeNull();
    rerender(<FeedbackForm sent submitting={false} error={null} onSend={vi.fn()} />);
    expect(screen.getByText('Sent. Thank you.')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
  });
});
