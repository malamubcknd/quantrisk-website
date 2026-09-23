// 'use client';

// import { usePathname, useRouter } from 'next/navigation';
// import { useEffect } from 'react';
// import { useAppState } from '@/stores/useAppState';
// import { canAccessRoute } from '@/lib/auth';
// import { ShieldAlert, ArrowLeft } from 'lucide-react';
// import Link from 'next/link';

// export function RouteGuard({ children }: { children: React.ReactNode }) {
//   const pathname = usePathname();
//   const router = useRouter();
//   const { state } = useAppState();

//   const { currentUser: user, isAuthLoading } = state;

//   useEffect(() => {
//     // If auth finishes loading and user is not logged in, send to login
//     if (!isAuthLoading && !user) {
//       router.push('/login');
//     }
//   }, [user, isAuthLoading, router]);

//   // 1. Show spinner while Supabase is resolving session
//   if (isAuthLoading) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
//         <div className="w-8 h-8 border-2 border-mtn-yellow/30 border-t-mtn-yellow rounded-full animate-spin" />
//         <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
//           Authenticating Session…
//         </span>
//       </div>
//     );
//   }

//   // 2. Prevent flash before redirecting
//   if (!user) return null;

//   // 3. Verify path permission against user role
//   const isAllowed = canAccessRoute(user.role, pathname);

//   if (!isAllowed) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in fade-in duration-300">
//         <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center mb-4">
//           <ShieldAlert className="w-8 h-8 text-error" />
//         </div>
//         <h2 className="text-xl font-hero font-bold text-on-surface mb-2">
//           Access Restricted
//         </h2>
//         <p className="text-sm font-sans text-on-surface-variant max-w-md mb-6 leading-relaxed">
//           Your account (<strong className="text-on-surface">{user.name || user.email}</strong>) is assigned the{' '}
//           <span className="inline-block px-2 py-0.5 rounded bg-mtn-yellow/10 border border-mtn-yellow/30 text-mtn-yellow font-mono text-xs uppercase font-bold">
//             {user.role}
//           </span>{' '}
//           role, which does not have permission to view <code className="font-mono text-xs text-on-surface bg-surface-container px-1.5 py-0.5 rounded">{pathname}</code>.
//         </p>
//         <Link
//           href="/dashboard"
//           className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline/20 font-mono text-xs uppercase tracking-widest text-on-surface transition-colors"
//         >
//           <ArrowLeft className="w-4 h-4" />
//           Return to Dashboard
//         </Link>
//       </div>
//     );
//   }

//   return <>{children}</>;
// }




'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppState } from '@/stores/useAppState';
import { canAccessRoute } from '@/lib/auth';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useAppState();

  const { currentUser: user, isAuthLoading } = state;

  useEffect(() => {
    // If auth finishes loading and user is not logged in, send to login
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // 1. Show spinner while session is loading
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-8 h-8 border-2 border-mtn-yellow/30 border-t-mtn-yellow rounded-full animate-spin" />
        <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
          Authenticating Session…
        </span>
      </div>
    );
  }

  // 2. Prevent flash before redirecting
  if (!user) return null;

  // 3. Verify path permission against user role
  const isAllowed = canAccessRoute(user.role, pathname);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-hero font-bold text-on-surface mb-2">
          Access Restricted
        </h2>
        <p className="text-sm font-sans text-on-surface-variant max-w-md mb-6 leading-relaxed">
          Your account (<strong className="text-on-surface">{user.name || user.email}</strong>) is assigned the{' '}
          <span className="inline-block px-2 py-0.5 rounded bg-mtn-yellow/10 border border-mtn-yellow/30 text-mtn-yellow font-mono text-xs uppercase font-bold">
            {user.role}
          </span>{' '}
          role, which does not have permission to view <code className="font-mono text-xs text-on-surface bg-surface-container px-1.5 py-0.5 rounded">{pathname}</code>.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline/20 font-mono text-xs uppercase tracking-widest text-on-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}