import { getSupabaseServer } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/platform";

/** Logged-in business or admin, from the Supabase session. False when auth isn't configured. */
export async function isServerStaffUser(): Promise<boolean> {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = data && typeof data.role === "string" ? data.role : null;
    return isStaffRole(role);
  } catch {
    return false;
  }
}
