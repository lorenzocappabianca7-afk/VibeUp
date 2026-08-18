import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

/** Deletes the signed-in Auth user (cascades to profiles). */
export async function POST(_request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Autenticazione non configurata." },
      { status: 503 },
    );
  }

  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("[delete-account]", error.message);
      return NextResponse.json(
        { error: "Non sono riuscito a eliminare l’account." },
        { status: 500 },
      );
    }

    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[delete-account]", error);
    return NextResponse.json(
      { error: "Non sono riuscito a eliminare l’account." },
      { status: 500 },
    );
  }
}
