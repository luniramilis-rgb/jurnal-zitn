import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { AuthScreen } from '@/components/layout/AuthScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/hooks/useLocale';
import { api } from '@/lib/api';

// SF-3: this page is public and MUST NOT call useAuth() or mount the
// ['auth','me'] query — the api client's global 401 interception would
// redirect a logged-out visitor to /login, destroying the #token fragment
// before the page renders.

// SF-2: API errors are discriminated on the envelope's code
// ({ error: { code } }) — never on err.message, never on bare status.
function errorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  return (err as { error?: { code?: string } }).error?.code;
}

// D6: the emailed link carries the token in the URL fragment
// (`/verify-email#token=<hex>`) so it never leaves the browser.
function readTokenFromHash(): string {
  const hash = window.location.hash;
  return hash.startsWith('#token=') ? hash.slice('#token='.length) : '';
}

function VerifyEmailPage() {
  const t = useT();
  const [token] = useState(readTokenFromHash);
  const [state, setState] = useState<'idle' | 'success' | 'expired'>('idle');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // REQ-4.8: consumption requires this explicit user gesture — fetching the
  // emailed URL alone (prefetchers, link scanners) consumes nothing.
  const onVerify = async () => {
    setApiError('');
    setIsSubmitting(true);
    try {
      // The token travels in the POST body, never a query string (REQ-3.9).
      await api.post('/auth/verify-email', { token });
      setState('success');
    } catch (err: unknown) {
      const code = errorCode(err);
      if (code === 'INVALID_OR_EXPIRED_TOKEN') {
        setState('expired');
      } else if (code === 'RATE_LIMITED') {
        setApiError(t('auth.error.rateLimited'));
      } else {
        setApiError(t('auth.error.generic'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.verify.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!token && (
            <p className="text-sm text-muted-foreground">
              {t('auth.verify.missingToken')} {t('auth.verify.resendPrefix')}{' '}
              <Link to="/settings/account" className="underline">
                {t('auth.verify.accountSettings')}
              </Link>
              .
            </p>
          )}

          {token && state === 'success' && (
            <>
              <p className="text-sm text-muted-foreground">{t('auth.verify.success')}</p>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/dashboard" className="underline">
                  {t('auth.verify.goDashboard')}
                </Link>
              </p>
            </>
          )}

          {token && state === 'expired' && (
            <p className="text-sm text-muted-foreground">
              {t('auth.link.expired')} {t('auth.verify.resendPrefix')}{' '}
              <Link to="/settings/account" className="underline">
                {t('auth.verify.accountSettings')}
              </Link>
              .
            </p>
          )}

          {token && state === 'idle' && (
            <>
              {apiError && <p className="mb-4 text-sm text-destructive">{apiError}</p>}

              <Button
                type="button"
                className="w-full cursor-pointer"
                disabled={isSubmitting}
                onClick={onVerify}
              >
                {isSubmitting ? t('auth.verify.submitting') : t('auth.verify.submit')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
});
