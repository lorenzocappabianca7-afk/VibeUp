"use client";

import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase/browser";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * If a recovery session lands on home (hash tokens / Site URL fallback),
 * move the user to /reset-password so they can set a new password.
 */
export function RecoveryRedirect() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith("/reset-password")) return;
    if (!isSupabaseBrowserConfigured()) return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace(/^#/, "");
    const isRecoveryHash =
      hash.includes("type=recovery") ||
      (hash.includes("access_token") && hash.includes("type=recovery"));

    async function run() {
      const supabase = getSupabaseBrowser();

      if (isRecoveryHash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          window.history.replaceState(null, "", window.location.pathname);
          router.replace("/reset-password");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const { data: claimsData } = await supabase.auth.getClaims();
      const amr = claimsData?.claims?.amr;
      const isRecoverySession = Array.isArray(amr)
        ? amr.some((entry) =>
            typeof entry === "string" ? entry === "recovery" : entry.method === "recovery",
          )
        : false;

      if (isRecoverySession && (pathname === "/" || pathname === "")) {
        router.replace("/reset-password");
      }
    }

    void run();
  }, [pathname, router]);

  return null;
}
