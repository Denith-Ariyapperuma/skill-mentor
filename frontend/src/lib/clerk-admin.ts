/**
 * Admin is defined only in Clerk user **public metadata** (no separate DB flag).
 *
 * Canonical: `publicMetadata.roles` includes `"ADMIN"` (matches Spring `hasRole('ADMIN')` when
 * the same array is forwarded in your JWT template — see README).
 *
 * Legacy: `publicMetadata.role === "admin"` (lowercase) still works for the UI.
 */
export function isClerkAppAdmin(
  user: { publicMetadata?: Record<string, unknown> } | null | undefined,
): boolean {
  if (!user?.publicMetadata) return false;
  const m = user.publicMetadata;

  const roles = m.roles;
  if (Array.isArray(roles)) {
    const upper = roles.filter((x): x is string => typeof x === "string").map((r) => r.toUpperCase());
    if (upper.includes("ADMIN")) return true;
  }

  if (m.role === "admin") return true;

  return false;
}
