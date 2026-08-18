import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

/** Completes email confirm / password-recovery magic links from Supabase. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return NextResponse.redirect(`${origin}/`);
  }

  if (code) {
    try {
      const supabase = await getSupabaseServer();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const failTarget =
          next === "/reset-password"
            ? `/reset-password?error=${encodeURIComponent("expired")}`
            : `/?authError=${encodeURIComponent(error.message)}`;
        return NextResponse.redirect(`${origin}${failTarget}`);
      }
    } catch {
      const failTarget =
        next === "/reset-password"
          ? "/reset-password?error=callback"
          : "/?authError=callback";
      return NextResponse.redirect(`${origin}${failTarget}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
