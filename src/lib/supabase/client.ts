import { createBrowserClient } from "@supabase/ssr";

// ~400 days — the maximum cookie lifetime browsers honour. Combined with the
// refresh token auto-renewing on every visit, this keeps you signed in
// indefinitely until you explicitly sign out.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * Supabase client for use in Client Components (browser). Sessions persist and
 * auto-refresh by default; the long-lived cookie makes them survive restarts.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { maxAge: SESSION_MAX_AGE },
    },
  );
}
