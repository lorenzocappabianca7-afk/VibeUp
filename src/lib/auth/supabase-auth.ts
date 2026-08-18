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
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        displayName: params.displayName,
        phone: params.phone ?? "",
        role: params.role ?? "consumer",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      return {
        ok: false as const,
        error: payload.error || "Registrazione non riuscita.",
      };
    }
    return {
      ok: true as const,
      needsEmailConfirmation: true as const,
    };
  } catch {
    return {
      ok: false as const,
      error: "Non riesco a creare l’account. Controlla la connessione.",
    };
  }
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

/**
 * Requests a password-reset email via Resend (From: info@vibeupevents.com),
 * not Supabase's default mailer. Unknown emails still return ok (no account leak).
 */
export async function supabaseResetPassword(email: string) {
  try {
    const response = await fetch("/api/auth/send-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!response.ok) {
      return {
        ok: false as const,
        error:
          payload.error ||
          "Non riesco a inviare il link di recupero. Riprova tra poco.",
      };
    }

    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Non riesco a inviare il link di recupero. Controlla la connessione.",
    };
  }
}

export async function supabaseUpdatePassword(nextPassword: string) {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function supabaseUpdateEmail(nextEmail: string) {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.auth.updateUser({ email: nextEmail });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function supabaseDeleteCurrentAccount() {
  try {
    const response = await fetch("/api/auth/delete-account", {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      return {
        ok: false as const,
        error: payload.error || "Eliminazione non riuscita.",
      };
    }
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Non riesco a eliminare l’account. Controlla la connessione.",
    };
  }
}

export async function supabaseSignOut() {
  if (!isSupabaseBrowserConfigured()) return { ok: true as const };
  const supabase = getSupabaseBrowser();
  const global = await supabase.auth.signOut({ scope: "global" });
  if (!global.error) return { ok: true as const };

  const local = await supabase.auth.signOut({ scope: "local" });
  if (local.error) {
    return { ok: false as const, error: local.error.message };
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
