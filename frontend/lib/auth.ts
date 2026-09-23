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