import { useEffect, useRef, useState } from 'react';

import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_TYPES,
  type FeedbackType,
  type MessageKey,
} from '@jurnal-zitn/shared';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

interface FeedbackFormProps {
  sent: boolean;
  submitting: boolean;
  error: string | null;
  onSend: (type: FeedbackType, message: string) => void;
}

const TYPE_LABELS: Record<FeedbackType, MessageKey> = {
  bug: 'feedback.form.types.bug',
  feature: 'feedback.form.types.feature',
  general: 'feedback.form.types.general',
  question: 'feedback.form.types.question',
};

/**
 * FeedbackForm — the in-app feedback composer (ZITN-TECH-017 §10.4, F0b),
 * mirroring the ZITN dashboard feedback pattern: a type (Bug/Feature/General/
 * Question), a 10–500 character message, and the page URL sent automatically by
 * the parent. Pure presentation: it holds local input state and a synchronous
 * double-submit guard; the parent owns the open/submitting/sent lifecycle.
 */
export function FeedbackForm({ sent, submitting, error, onSend }: FeedbackFormProps) {
  const t = useT();
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  // Checked-and-set before onSend fires, so the parent receives at most one
  // submission per mount even on a double click.
  const sendingRef = useRef(false);
  // Re-arm the guard when the request settles, so a failed send can be retried.
  useEffect(() => {
    if (!submitting) sendingRef.current = false;
  }, [submitting]);

  if (sent) {
    return <p className="text-sm text-popover-foreground">{t('feedback.form.sent')}</p>;
  }

  const trimmedLength = message.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < FEEDBACK_MESSAGE_MIN;
  const canSend = type !== null && trimmedLength >= FEEDBACK_MESSAGE_MIN && !submitting;

  function handleSend() {
    if (!canSend || type === null) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    onSend(type, message.trim());
  }

  const remaining = FEEDBACK_MESSAGE_MAX - message.length;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div
          role="radiogroup"
          aria-label={t('feedback.form.typeLabel')}
          className="flex flex-wrap gap-2"
        >
          {FEEDBACK_TYPES.map((value) => {
            const selected = type === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setType(value)}
                className={cn(
                  'cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  selected
                    ? 'border-2 border-foreground bg-secondary text-secondary-foreground'
                    : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {t(TYPE_LABELS[value])}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Textarea
          aria-label={t('feedback.form.messageLabel')}
          placeholder={t('feedback.form.messagePlaceholder')}
          maxLength={FEEDBACK_MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{tooShort ? t('feedback.form.tooShort') : ''}</span>
          {remaining < 200 && <span>{t('feedback.form.counter', { n: remaining })}</span>}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t('feedback.form.pageNote')}</p>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        className="w-full cursor-pointer"
        disabled={!canSend}
        onClick={handleSend}
      >
        {t('feedback.form.send')}
      </Button>
    </div>
  );
}
