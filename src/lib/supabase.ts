import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Singleton browser client
let browserClient: SupabaseClient | null = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client during build/prerender when env vars are missing
    return createSSRBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }
  browserClient = createSSRBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

// Server admin client (uses service role key - never expose to browser)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
