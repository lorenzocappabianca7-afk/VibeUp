import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Completes email confirm / password-recovery magic links from Supabase. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return NextResponse.redirect(`${origin}/`);
  }

  if (code) {
    try {
      const supabase = await getSupabaseServer();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          `${origin}/?authError=${encodeURIComponent(error.message)}`,
        );
      }
    } catch {
      return NextResponse.redirect(`${origin}/?authError=callback`);
    }
  }

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
}
