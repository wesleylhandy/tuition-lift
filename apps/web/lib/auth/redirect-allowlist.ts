/**
 * Redirect allowlist — validates redirectTo to prevent open redirects.
 * Used by middleware, auth callback, and Server Actions.
 * @see specs/012-auth-bridge-protected-routing/contracts/redirect-allowlist.md
 */

const ALLOWED_PREFIXES = ['/dashboard', '/scout', '/onboard'] as const;

/**
 * Returns a safe redirect path. Rejects protocol-relative, scheme-based,
 * and non-allowlisted paths. Falls back to defaultPath when invalid.
 */
export function getSafeRedirectTo(
  redirectTo: string | null | undefined,
  defaultPath: string
): string {
  if (!redirectTo || typeof redirectTo !== 'string') return defaultPath;

  let decoded: string;
  try {
    decoded = decodeURIComponent(redirectTo.trim());
  } catch {
    return defaultPath;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) return defaultPath;
  if (/javascript:|data:/i.test(decoded)) return defaultPath;

  const allowed = ALLOWED_PREFIXES.some(
    (p) => decoded === p || decoded.startsWith(`${p}/`)
  );
  return allowed ? decoded : defaultPath;
}
