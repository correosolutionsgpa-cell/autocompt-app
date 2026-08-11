/**
 * Founder/SuperAdmin allowlist — the single source of truth for who gets
 * unlimited access to AutoCompt (bypasses trial/tier limits, sees every
 * account in the admin panel, etc).
 *
 * Was previously duplicated inline in 4+ places across App.tsx, each
 * re-typing Fabiola's personal email — fragile to maintain and, now that
 * AutoCompt is sold to other companies rather than being her own internal
 * tool, worth keeping to exactly one place in the codebase instead of
 * scattered through business logic. Consolidated 2026-08-11.
 *
 * Mirrors isSuperAdmin() in firestore.rules — update both if this list
 * ever changes (Firestore rules can't import from here).
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  const e = (email ?? "").toLowerCase().trim();
  if (!e) return false;
  return (
    e === "correo.solutionsgpa@gmail.com" ||
    e === "solutionsgpa@gmail.com" ||
    e.startsWith("fabiola") ||
    e.includes("solutionsgpa") ||
    e.endsWith("@autocompt.ca")
  );
}
