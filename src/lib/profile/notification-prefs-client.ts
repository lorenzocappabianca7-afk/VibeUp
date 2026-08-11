import type { ManagerNotificationPrefs } from "@/types/manager-notification-prefs";
import {
  normalizeManagerNotificationPrefs,
  validateManagerNotificationPrefs,
} from "@/types/manager-notification-prefs";

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
}

export async function fetchManagerNotificationPrefs(): Promise<{
  ok: boolean;
  configured: boolean;
  prefs: ManagerNotificationPrefs | null;
  error?: string;
}> {
  try {
    const response = await fetch("/api/profile/notification-prefs", {
      method: "GET",
      credentials: "same-origin",
    });
    const payload = await parseJson(response);
    if (!response.ok) {
      return {
        ok: false,
        configured: Boolean(payload?.configured),
        prefs: null,
        error:
          typeof payload?.error === "string"
            ? payload.error
            : "Caricamento preferenze fallito.",
      };
    }
    return {
      ok: true,
      configured: Boolean(payload?.configured),
      prefs: normalizeManagerNotificationPrefs(
        payload?.prefs && typeof payload.prefs === "object"
          ? (payload.prefs as ManagerNotificationPrefs)
          : null,
      ),
    };
  } catch {
    return {
      ok: false,
      configured: false,
      prefs: null,
      error: "Connessione non disponibile.",
    };
  }
}

export async function saveManagerNotificationPrefsRemote(
  prefs: ManagerNotificationPrefs,
): Promise<
  | { ok: true; prefs: ManagerNotificationPrefs }
  | { ok: false; error: string; configured?: boolean }
> {
  const validated = validateManagerNotificationPrefs(prefs);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  try {
    const response = await fetch("/api/profile/notification-prefs", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated.prefs),
    });
    const payload = await parseJson(response);
    if (!response.ok) {
      return {
        ok: false,
        configured: Boolean(payload?.configured),
        error:
          typeof payload?.error === "string"
            ? payload.error
            : "Salvataggio preferenze fallito.",
      };
    }
    return {
      ok: true,
      prefs: normalizeManagerNotificationPrefs(
        payload?.prefs && typeof payload.prefs === "object"
          ? (payload.prefs as ManagerNotificationPrefs)
          : validated.prefs,
      ),
    };
  } catch {
    return { ok: false, error: "Connessione non disponibile." };
  }
}
