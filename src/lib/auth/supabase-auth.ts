import {
  getSupabaseBrowser,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/browser";

export type AppRole = "guest" | "consumer" | "business" | "admin";

export interface SupabaseProfile {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  phone: string | null;
  avatar_url: string | null;
}

export function mapProfileRoleToAccountType(
  role: AppRole,
): "consumer" | "business" {
  return role === "business" ? "business" : "consumer";
}

export async function supabaseSignUp(params: {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  role?: Exclude<AppRole, "guest" | "admin">;
}) {
  const supabase = getSupabaseBrowser();
  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      data: {
        display_name: params.displayName,
        role: params.role ?? "consumer",
        phone: params.phone ?? "",
      },
    },
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (data.user && params.phone) {
    await supabase
      .from("profiles")
      .update({
        phone: params.phone,
        display_name: params.displayName,
      })
      .eq("id", data.user.id);
  }

  return {
    ok: true as const,
    user: data.user,
    session: data.session,
    needsEmailConfirmation: !data.session,
  };
}

export async function supabaseSignIn(params: {
  email: string;
  password: string;
}) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    user: data.user,
    session: data.session,
  };
}

export async function supabaseResetPassword(email: string) {
  const supabase = getSupabaseBrowser();
  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/auth/callback?next=/` : undefined,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

export async function supabaseUpdatePassword(nextPassword: string) {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function supabaseSignOut() {
  if (!isSupabaseBrowserConfigured()) return { ok: true as const };
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function fetchSupabaseProfile(
  userId: string,
): Promise<SupabaseProfile | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,phone,avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SupabaseProfile;
}
