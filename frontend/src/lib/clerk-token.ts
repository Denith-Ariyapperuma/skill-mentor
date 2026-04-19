import type { useAuth } from "@clerk/clerk-react";

type GetTokenFn = ReturnType<typeof useAuth>["getToken"];

const TEMPLATE = "skillmentor-auth";

/**
 * Token for Spring Boot (Clerk JWKS verification).
 * 1) Prefer custom JWT template (adds `roles`, etc.).
 * 2) If template is missing or returns null, fall back to default session JWT (still signed by Clerk).
 */
export async function getTokenForBackend(
  getToken: GetTokenFn,
): Promise<string | null> {
  try {
    const fromTemplate = await getToken({ template: TEMPLATE });
    if (fromTemplate) return fromTemplate;
  } catch {
    // Template name not created in Clerk Dashboard — use default JWT
  }
  try {
    return (await getToken()) ?? null;
  } catch {
    return null;
  }
}
