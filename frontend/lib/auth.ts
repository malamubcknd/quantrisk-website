// frontend/lib/auth.ts

export const TOKEN_COOKIE = 'mtn_qr_token';
export const USER_COOKIE = 'mtn_qr_user';

export type Role = 'admin' | 'finance' | 'risk' | 'executive' | 'analyst' | 'marketing';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthUser {
  email: string;
  role: string;
  name: string;
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
    admin: ['*'], analyst: ['*'],

  finance: [
    '/dashboard',
    '/scenario-automate', 
    '/business-stress',
    '/forecasts',
    '/economics',
    '/monthly',
    '/quarterly',
    '/settings',
    '/help',
  ],

  risk: [
    '/dashboard',
    '/scenarios',         
    '/compare',
    '/monte-carlo',
    '/reverse',
    '/kri-register',
    '/intelligence',
    '/alerts',
    '/news',
    '/settings',
    '/help',
  ],

  // analyst: [
  //   '/dashboard',
  //   '/scenarios',         
  //   '/compare',
  //   '/monte-carlo',
  //   '/reverse',
  //   '/kri-register',
  //   '/intelligence',
  //   '/alerts',
  //   '/news',
  //   '/settings',
  //   '/help',
  // ],

  executive: [
    '/dashboard',
    '/briefs',            
    '/intelligence',
    '/news',
    '/help',
  ],

  marketing: [
    '/dashboard',
    '/news',
    '/settings',
    '/help',
  ],
};

export function canAccessRoute(role: Role | string, path: string): boolean {
  const allowedRoutes = ROLE_PERMISSIONS[role as Role];
  if (!allowedRoutes) return false;
  if (allowedRoutes.includes('*')) return true;
  if (path === '/' || path === '') return true;

  return allowedRoutes.some(
    route => path === route || path.startsWith(`${route}/`)
  );
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${USER_COOKIE}=`))
      ?.split('=')[1];
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw)) as AuthUser;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${TOKEN_COOKIE}=`));
  return match ? (match.split('=')[1] ?? null) : null;
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0`;
  document.cookie = `${USER_COOKIE}=; Path=/; Max-Age=0`;
}

// ── Session expiry helpers ─────────────────────────────────────────────────────

/** Read the `exp` claim (seconds since epoch) from a JWT without verifying it. */
export function getTokenExpiry(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

/** True if the token is missing, malformed or past its expiry time. */
export function isTokenExpired(token: string | null | undefined): boolean {
  const exp = getTokenExpiry(token);
  return exp === null || Date.now() >= exp * 1000;
}

let _loggingOut = false;

/** Clear the session everywhere and send the user to the login page. */
export async function forceLogout(reason: 'expired' | 'signout' = 'expired'): Promise<void> {
  if (typeof window === 'undefined' || _loggingOut) return;
  _loggingOut = true;
  clearAuthCookies();
  try {
    // Server route also clears the httpOnly copy of the user cookie
    await fetch('/auth/logout', { method: 'POST' });
  } catch {
    // ignore — cookies were already cleared client-side
  }
  window.location.replace(reason === 'expired' ? '/login?error=expired' : '/login');
}

