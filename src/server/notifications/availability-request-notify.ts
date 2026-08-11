import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  sendAvailabilityRequestToManager,
  type ManagerNotifyTarget,
  type NotifyResult,
} from "@/server/notifications/manager-availability-notifier";
import type { AvailabilityRequest } from "@/types/availability-request";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function resolveListingOwnerId(params: {
  locationId: string;
  listingId: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();

  if (params.listingId && isUuid(params.listingId)) {
    const { data } = await supabase
      .from("listings")
      .select("owner_id")
      .eq("id", params.listingId)
      .maybeSingle();
    if (data?.owner_id) return data.owner_id as string;
  }

  if (isUuid(params.locationId)) {
    const { data } = await supabase
      .from("listings")
      .select("owner_id")
      .eq("id", params.locationId)
      .maybeSingle();
    if (data?.owner_id) return data.owner_id as string;
  }

  return null;
}

export async function resolveManagerNotifyTarget(params: {
  locationId: string;
  listingId: string | null;
}): Promise<ManagerNotifyTarget | null> {
  const ownerId = await resolveListingOwnerId(params);
  if (!ownerId) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "email, notification_channel, notification_whatsapp_number, notification_email",
    )
    .eq("id", ownerId)
    .maybeSingle();

  if (error || !data) {
    console.warn(
      "[availability-notify] profilo gestore non trovato",
      ownerId,
      error?.message,
    );
    return null;
  }

  const channel =
    data.notification_channel === "whatsapp" ? "whatsapp" : "email";
  const notificationEmail =
    typeof data.notification_email === "string" &&
    data.notification_email.trim().length > 0
      ? data.notification_email.trim()
      : null;
  const loginEmail =
    typeof data.email === "string" && data.email.trim().length > 0
      ? data.email.trim()
      : null;

  return {
    channel,
    whatsappNumber: data.notification_whatsapp_number ?? null,
    email: notificationEmail ?? loginEmail,
  };
}

/**
 * Fire manager notification for an already-persisted request.
 * Never throws — failures are returned/logged for admin retry.
 */
export async function notifyManagerAboutAvailabilityRequest(
  request: AvailabilityRequest,
  listingId: string | null = null,
): Promise<NotifyResult> {
  try {
    const manager = await resolveManagerNotifyTarget({
      locationId: request.locationId,
      listingId,
    });

    if (!manager) {
      const result = {
        ok: false as const,
        error:
          "Gestore non trovato per questa location/servizio (owner_id assente o profilo mancante).",
      };
      console.warn(
        "[availability-notify] skip notify",
        request.id,
        result.error,
      );
      return result;
    }

    const result = await sendAvailabilityRequestToManager(request, manager);
    if (!result.ok) {
      console.error(
        "[availability-notify] invio fallito",
        request.id,
        result.error,
      );
    }
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore notifica gestore.";
    console.error("[availability-notify] exception", request.id, message);
    return { ok: false, error: message };
  }
}
