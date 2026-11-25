import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { ensureAccountProvisioned } from '@/lib/auth/provisioning';
import { resolvePostLoginRedirect } from '@/lib/auth/routes';
import { getSiteUrl, sanitizeInternalRedirect } from '@/lib/auth/url';
import { AccountStatus } from '@/generated/prisma/enums';

const VALID_EMAIL_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'email',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
];

function parseOtpType(rawType: string | null): EmailOtpType | null {
  if (!rawType) return null;
  const lower = rawType.toLowerCase();
  if (VALID_EMAIL_OTP_TYPES.includes(lower as EmailOtpType)) {
    return lower as EmailOtpType;
  }
  return null;
}

/**
 * Auth Callback Route Handler.
 * Exchanges the email verification token_hash or PKCE code for an authenticated session.
 *
 * Server-side Token-Hash Confirmation Architecture:
 * 1. Accepts: ?token_hash=<token>&type=<type>
 * 2. Verifies OTP server-side via supabase.auth.verifyOtp({ token_hash, type }).
 * 3. Synchronizes session cookies directly onto the redirect response via @supabase/ssr.
 * 4. Ensures the CUSTOMER application account and CustomerProfile exist in PostgreSQL.
 * 5. Redirects verified customer to safe internal destination (defaults to '/').
 * 6. On failure, redirects safely to /login?error=...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const rawType = searchParams.get('type');
  const type = parseOtpType(rawType) ?? (token_hash ? 'signup' : null);

  const siteUrl = getSiteUrl();
  const rawNext = searchParams.get('next');
  const fallbackDestination = type === 'recovery' ? '/reset-password' : '/';
  const next = sanitizeInternalRedirect(rawNext, fallbackDestination);
  const isRecoveryFlow =
    type === 'recovery' ||
    next === '/reset-password' ||
    next.startsWith('/reset-password?') ||
    next.startsWith('/reset-password/');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/login?error=missing_config', siteUrl));
  }

  const redirectResponse = NextResponse.redirect(new URL(next, siteUrl));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          redirectResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // 1. Primary: Server-side token-hash OTP verification
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data.user) {
      try {
        const provisioned = await ensureAccountProvisioned(data.user);
        if (!provisioned) {
          await supabase.auth.signOut();
          console.error(
            '[Auth Callback] Application account verification failed for OTP user:',
            data.user.id
          );
          return NextResponse.redirect(new URL('/login?error=account_setup_required', siteUrl));
        }

        if (provisioned.user.accountStatus === AccountStatus.SUSPENDED) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL('/login?error=account_suspended', siteUrl));
        }

        if (provisioned.user.accountStatus !== AccountStatus.ACTIVE) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL('/login?error=account_inactive', siteUrl));
        }

        if (!isRecoveryFlow) {
          const safeDestination = resolvePostLoginRedirect(provisioned.user.role, rawNext);
          redirectResponse.headers.set('Location', new URL(safeDestination, siteUrl).toString());
        }

        return redirectResponse;
      } catch (err) {
        console.error('[Auth Callback] Unexpected OTP provisioning error:', err);
        return NextResponse.redirect(new URL('/login?error=account_setup_failed', siteUrl));
      }
    } else if (error) {
      console.error('[Auth Callback] verifyOtp failed:', error.message);
      return NextResponse.redirect(new URL('/login?error=auth_callback_failed', siteUrl));
    }
  }

  // 2. Fallback: PKCE code exchange flow
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      try {
        const provisioned = await ensureAccountProvisioned(data.user);
        if (!provisioned) {
          await supabase.auth.signOut();
          console.error(
            '[Auth Callback] Application account verification failed for auth user:',
            data.user.id
          );
          return NextResponse.redirect(new URL('/login?error=account_setup_required', siteUrl));
        }

        if (provisioned.user.accountStatus === AccountStatus.SUSPENDED) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL('/login?error=account_suspended', siteUrl));
        }

        if (provisioned.user.accountStatus !== AccountStatus.ACTIVE) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL('/login?error=account_inactive', siteUrl));
        }

        if (!isRecoveryFlow) {
          const safeDestination = resolvePostLoginRedirect(provisioned.user.role, rawNext);
          redirectResponse.headers.set('Location', new URL(safeDestination, siteUrl).toString());
        }

        return redirectResponse;
      } catch (err) {
        console.error('[Auth Callback] Unexpected provisioning error:', err);
        return NextResponse.redirect(new URL('/login?error=account_setup_failed', siteUrl));
      }
    } else if (error) {
      console.error('[Auth Callback] exchangeCodeForSession failed:', error.message);
      return NextResponse.redirect(new URL('/login?error=auth_callback_failed', siteUrl));
    }
  }

  // If neither token_hash nor code succeeded or both were absent
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', siteUrl));
}
