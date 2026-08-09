import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** Browser client (anon key + cookie session via @supabase/ssr). */
export function getSupabaseBrowser(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Supabase browser non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
