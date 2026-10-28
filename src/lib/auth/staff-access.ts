import { isListedAdminEmail } from "@/lib/admin-access";
import { getSupabaseServer } from "@/lib/supabase/server";

export type ServerAdminAccess = "anonymous" | "forbidden" | "allowed";

/** Session mailbox checked against ADMIN_EMAILS. Anonymous when auth isn't configured. */
export async function getServerAdminAccess(): Promise<ServerAdminAccess> {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "anonymous";
    return isListedAdminEmail(user.email) ? "allowed" : "forbidden";
  } catch {
    return "anonymous";
  }
}
