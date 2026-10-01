import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { LoginSchema, safeLocalRedirect, type LoginInput } from '@jurnal-zitn/shared';

import { AuthScreen } from '@/components/layout/AuthScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLocale';
import { useJournalSsoEnabled, useRegistrationEnabled } from '@/hooks/useRegistrationEnabled';
import { apiErrorMessage } from '@/lib/api-error';

// SF-3: this page is public and MUST NOT call useAuth() or mount the
// ['auth','me'] query — the api client's global 401 interception would answer a
// logged-out visitor's cold load by navigating to /login?expired=true, so the
// page would greet them with a session-expired notice for a session they never
// had. useLogin is the login mutation without that query.

function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const t = useT();
  const { registrationEnabled } = useRegistrationEnabled();
  const journalSsoEnabled = useJournalSsoEnabled();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const expired = new URLSearchParams(window.location.search).get('expired');
  const deleted = new URLSearchParams(window.location.search).get('deleted');
  // The local target carried through login (and the ZITN SSO door). Sanitised
  // once; `/dashboard` when absent or unsafe.
  const redirectTarget = safeLocalRedirect(
    new URLSearchParams(window.location.search).get('redirect'),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    // `onChange` so the submit button can track validity as the user types
    // (disabled until email + password are valid); submit still re-validates.
    mode: 'onChange',
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError('');
    try {
      await login.mutateAsync(data);
      // Honour ?redirect= (local path only). `to` is a typed route union, so the
      // runtime-validated target is applied as-is.
      navigate({ to: redirectTarget } as never);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setApiError(apiErrorMessage(error, t));
    }
  };

  return (
    <AuthScreen>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.login.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {expired === 'true' && (
            <p className="mb-4 text-sm text-destructive">{t('auth.login.expired')}</p>
          )}

          {/* Deletion is not an error — muted, never text-destructive. The
              account-deletion hook navigates here after a `deleted` outcome. */}
          {deleted === 'true' && (
            <p className="mb-4 text-sm text-muted-foreground">{t('auth.login.deleted')}</p>
          )}

          {apiError && <p className="mb-4 text-sm text-destructive">{apiError}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.field.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.field.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-12"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={
                    showPassword ? t('auth.field.hidePassword') : t('auth.field.showPassword')
                  }
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:h-11 pointer-coarse:w-11"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Always rendered (REQ-8.3, D14): on an email-less instance the
                linked page shows the defined-unavailability state. */}
            <p className="text-right text-sm">
              <Link to="/forgot-password" className="text-muted-foreground underline">
                {t('auth.login.forgot')}
              </Link>
            </p>

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
            </Button>
          </form>

          {/* ZITN SSO door (ZITN-TECH-029): shown only when the operator opted in
              (posture). The href is a same-origin journal endpoint that forwards
              the browser to ZITN's bridge; it carries the same sanitized target. */}
          {journalSsoEnabled && (
            <>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{t('auth.login.or')}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <a
                href={`/api/auth/sso/start?redirect=${encodeURIComponent(redirectTarget)}`}
                className="flex w-full cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {t('auth.login.continueWithZitn')}
              </a>
            </>
          )}

          {/* Hidden when this instance has registration closed (newsletter
              REQ-9.4), so /register's launch notice is a backstop for a typed
              or bookmarked URL rather than the normal way in. The hook fails
              open, so an unconfigured self-hoster still sees this and so does a
              visitor whose /api/config read failed. It is not the control — the
              server refuses the POST either way. */}
          {registrationEnabled && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="underline">
                {t('auth.login.register')}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

interface LoginSearch {
  expired?: boolean;
  deleted?: boolean;
  redirect?: string;
}

export const Route = createFileRoute('/login')({
  // All three are read from the raw query in the component above; this only
  // ROUND-TRIPS them through the typed search. A typed navigate here — the
  // account-deletion hook's `deleted`, lib/api's `expired`, or a caller passing
  // `redirect` — must find its key declared, and validateSearch must return it so
  // it is not stripped from the URL the component then reads.
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    expired: search.expired === true || search.expired === 'true' ? true : undefined,
    deleted: search.deleted === true || search.deleted === 'true' ? true : undefined,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
});
