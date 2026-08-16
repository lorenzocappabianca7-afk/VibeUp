import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveManagerNotifyTarget } from "@/server/notifications/availability-request-notify";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type ManagerContactForEvent = {
  confirmed: boolean;
  whatsappNumber: string | null;
  locationId: string | null;
  locationName: string | null;
};

/**
 * Resolve manager WhatsApp for an organizer's event/booking.
 * Contact is returned only when the linked request is confirmed
 * or the deposit payment is marked paid.
 */
export async function getManagerContactForOrganizerEvent(params: {
  organizerId: string;
  eventId: string;
  locationId?: string | null;
}): Promise<ManagerContactForEvent> {
  const empty: ManagerContactForEvent = {
    confirmed: false,
    whatsappNumber: null,
    locationId: params.locationId ?? null,
    locationName: null,
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = getSupabaseAdmin();
  let locationId = params.locationId?.trim() || null;
  let locationName: string | null = null;
  let listingId: string | null = null;
  let confirmed = false;

  if (isUuid(params.eventId)) {
    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, organizer_id, location_id, listing_id, location_name, availability_request_id",
      )
      .eq("id", params.eventId)
      .maybeSingle();

    if (booking && booking.organizer_id === params.organizerId) {
      locationId =
        (typeof booking.location_id === "string" && booking.location_id) ||
        locationId;
      listingId =
        typeof booking.listing_id === "string" ? booking.listing_id : null;
      locationName =
        typeof booking.location_name === "string"
          ? booking.location_name
          : null;

      if (
        typeof booking.availability_request_id === "string" &&
        booking.availability_request_id
      ) {
        const { data: request } = await supabase
          .from("availability_requests")
          .select("status")
          .eq("id", booking.availability_request_id)
          .maybeSingle();
        if (request?.status === "confirmed") confirmed = true;
      }

      if (!confirmed) {
        const { data: payment } = await supabase
          .from("booking_payments")
          .select("paid")
          .eq("booking_id", booking.id)
          .eq("kind", "deposit")
          .maybeSingle();
        if (payment?.paid === true) confirmed = true;
      }
    }
  }

  if (!confirmed && locationId) {
    const { data: request } = await supabase
      .from("availability_requests")
      .select("id, status, location_name, listing_id")
      .eq("requester_id", params.organizerId)
      .eq("location_id", locationId)
      .eq("status", "confirmed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (request) {
      confirmed = true;
      locationName =
        typeof request.location_name === "string"
          ? request.location_name
          : locationName;
      listingId =
        typeof request.listing_id === "string"
          ? request.listing_id
          : listingId;
    }
  }

  if (!confirmed || !locationId) {
    return {
      confirmed,
      whatsappNumber: null,
      locationId,
      locationName,
    };
  }

  const manager = await resolveManagerNotifyTarget({
    locationId,
    listingId,
  });

  let whatsappNumber = manager?.whatsappNumber?.trim() || null;

  // Fallback: profile phone on the listing owner (often set at onboarding).
  if (!whatsappNumber) {
    const ownerId = await resolveListingOwnerId(locationId, listingId);
    if (ownerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, notification_whatsapp_number")
        .eq("id", ownerId)
        .maybeSingle();
      const fromNotify =
        typeof profile?.notification_whatsapp_number === "string"
          ? profile.notification_whatsapp_number.trim()
          : "";
      const fromPhone =
        typeof profile?.phone === "string" ? profile.phone.trim() : "";
      whatsappNumber = fromNotify || fromPhone || null;
    }
  }

  return {
    confirmed: true,
    whatsappNumber,
    locationId,
    locationName,
  };
}

async function resolveListingOwnerId(
  locationId: string,
  listingId: string | null,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();

  if (listingId && isUuid(listingId)) {
    const { data } = await supabase
      .from("listings")
      .select("owner_id")
      .eq("id", listingId)
      .maybeSingle();
    if (data?.owner_id) return data.owner_id as string;
  }

  if (isUuid(locationId)) {
    const { data } = await supabase
      .from("listings")
      .select("owner_id")
      .eq("id", locationId)
      .maybeSingle();
    if (data?.owner_id) return data.owner_id as string;
  }

  return null;
}
