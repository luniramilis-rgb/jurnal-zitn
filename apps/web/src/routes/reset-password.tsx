import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PasswordResetCompleteSchema } from '@jurnal-zitn/shared/schemas/auth';

import { AuthScreen } from '@/components/layout/AuthScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/hooks/useLocale';
import { api } from '@/lib/api';

// SF-3: this page is public and MUST NOT call useAuth() or mount the
// ['auth','me'] query — the api client's global 401 interception would
// redirect a logged-out visitor to /login, destroying the #token fragment
// before the form renders. reset-password.test.tsx enforces this.

// SF-2: API errors are discriminated on the envelope's code
// ({ error: { code } }) — never on err.message, never on bare status.
function errorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  return (err as { error?: { code?: string } }).error?.code;
}

// D6: the emailed link carries the token in the URL fragment
// (`/reset-password#token=<hex>`) so it never leaves the browser.
function readTokenFromHash(): string {
  const hash = window.location.hash;
  return hash.startsWith('#token=') ? hash.slice('#token='.length) : '';
}

// The register.tsx confirm pattern, reusing the shared password policy.
const ResetPasswordFormBase = PasswordResetCompleteSchema.pick({ password: true }).extend({
  confirmPassword: z.string(),
});

type ResetPasswordFormInput = z.infer<typeof ResetPasswordFormBase>;

function ResetPasswordPage() {
  const t = useT();
  const [token] = useState(readTokenFromHash);
  const [state, setState] = useState<'form' | 'success' | 'expired'>('form');
  const [apiError, setApiError] = useState('');

  // Pesan mismatch ikut bahasa aktif; resolver dibangun ulang saat bahasa berganti.
  const formSchema = useMemo(
    () =>
      ResetPasswordFormBase.refine((data) => data.password === data.confirmPassword, {
        message: t('auth.error.passwordMismatch'),
        path: ['confirmPassword'],
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: ResetPasswordFormInput) => {
    setApiError('');
    try {
      // The token travels in the POST body, never a query string (REQ-3.9).
      await api.post('/auth/password-reset/complete', {
        token,
        password: data.password,
      });
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
    }
  };

  return (
    <AuthScreen>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.reset.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!token && (
            <p className="text-sm text-muted-foreground">
              {t('auth.reset.missingToken')}{' '}
              <Link to="/forgot-password" className="underline">
                {t('auth.reset.missingTokenCta')}
              </Link>
              .
            </p>
          )}

          {token && state === 'success' && (
            <>
              <p className="text-sm text-muted-foreground">{t('auth.reset.success')}</p>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/login" className="underline">
                  {t('auth.reset.loginLink')}
                </Link>
              </p>
            </>
          )}

          {token && state === 'expired' && (
            <p className="text-sm text-muted-foreground">
              {t('auth.link.expired')}{' '}
              <Link to="/forgot-password" className="underline">
                {t('auth.reset.requestNew')}
              </Link>
              .
            </p>
          )}

          {token && state === 'form' && (
            <>
              {apiError && <p className="mb-4 text-sm text-destructive">{apiError}</p>}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.field.newPassword')}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p id="password-error" className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.field.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p id="confirm-error" className="text-sm text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full cursor-pointer" disabled={isSubmitting}>
                  {isSubmitting ? t('auth.reset.submitting') : t('auth.reset.submit')}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
});
