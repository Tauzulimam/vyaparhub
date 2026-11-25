/**
 * Security-sensitive URL resolution and redirect validation for VyaparHub.
 */

/**
 * Resolves the trusted site URL for security-sensitive operations (e.g. email verification redirects).
 *
 * Security strategy:
 * 1. Primary: NEXT_PUBLIC_SITE_URL environment variable.
 * 2. In non-production (development / test): falls back to http://localhost:3000 if NEXT_PUBLIC_SITE_URL is unset.
 * 3. In production: strictly requires NEXT_PUBLIC_SITE_URL to prevent Host Header Poisoning.
 *
 * Never blindly trusts arbitrary Host, Origin, or X-Forwarded-Host request headers.
 */
export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }

  throw new Error(
    'Security Error: NEXT_PUBLIC_SITE_URL environment variable is required in production.'
  );
}

/**
 * Validates and sanitizes internal relative redirects to prevent open redirect vulnerabilities.
 *
 * Rejects:
 * - Protocol-relative URLs (e.g. '//evil.com')
 * - Backslash bypasses (e.g. '/\\evil.com')
 * - External absolute URLs (e.g. 'https://evil.com')
 * - Non-path schemes (e.g. 'javascript:...')
 *
 * Accepts only verified local relative paths (e.g. '/profile', '/cart').
 */
export function sanitizeInternalRedirect(
  rawPath: string | null | undefined,
  fallback = '/'
): string {
  if (!rawPath || typeof rawPath !== 'string') {
    return fallback;
  }

  const trimmed = rawPath.trim();

  // Reject paths that do not start with a single slash, or contain protocol-relative slashes,
  // backslashes, or ASCII control characters (e.g. tab/CR/LF URL-parser stripping bypasses)
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return fallback;
  }

  try {
    // Resolve against fixed localhost base to verify no origin mutation occurred
    const parsed = new URL(trimmed, 'http://localhost');
    if (
      parsed.origin !== 'http://localhost' ||
      !parsed.pathname.startsWith('/') ||
      parsed.pathname.startsWith('//')
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
