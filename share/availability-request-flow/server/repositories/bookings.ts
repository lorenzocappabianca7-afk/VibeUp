import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import {
  DEPOSIT_APP_FEE_RATE,
  roundCurrency,
} from "@/lib/booking-money";
import type {
  AvailabilityEventPayload,
  AvailabilityRequest,
  AvailabilityRequestStatus,
} from "@/types/availability-request";
import type { BookedService, UserEvent } from "@/types/event";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REQUEST_STATUSES = new Set<AvailabilityRequestStatus>([
  "pending_manager",
  "declined",
  "pending_user_confirm",
  "confirmed",
  "cancelled",
]);

export interface AvailabilityRequestRow {
  id: string;
  status: AvailabilityRequestStatus;
  requester_id: string;
  requester_name: string;
  requester_email: string | null;
  location_id: string;
  listing_id: string | null;
  location_name: string;
  event_payload: AvailabilityEventPayload;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  availability_request_id: string | null;
  organizer_id: string;
  status: string;
  location_id: string | null;
  listing_id: string | null;
  location_name: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  city: string;
  guest_count: number;
  total_cost: number;
  deposit_amount: number;
  services: BookedService[];
  deposit_due_at: string;
  created_at: string;
  updated_at: string;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asPayload(value: unknown): AvailabilityEventPayload {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const services = Array.isArray(raw.services)
    ? (raw.services as BookedService[])
    : [];
  return {
    title: typeof raw.title === "string" ? raw.title : "Evento",
    description: typeof raw.description === "string" ? raw.description : "",
    date: typeof raw.date === "string" ? raw.date : "",
    time: typeof raw.time === "string" ? raw.time : "",
    endTime: typeof raw.endTime === "string" ? raw.endTime : "",
    locationId: typeof raw.locationId === "string" ? raw.locationId : "",
    locationName: typeof raw.locationName === "string" ? raw.locationName : "",
    city: typeof raw.city === "string" ? raw.city : "",
    guestCount:
      typeof raw.guestCount === "number" && Number.isFinite(raw.guestCount)
        ? raw.guestCount
        : 0,
    services,
    totalCost:
      typeof raw.totalCost === "number" && Number.isFinite(raw.totalCost)
        ? raw.totalCost
        : 0,
    depositAmount:
      typeof raw.depositAmount === "number" && Number.isFinite(raw.depositAmount)
        ? raw.depositAmount
        : 0,
    requestKind:
      raw.requestKind === "service" || raw.requestKind === "location"
        ? raw.requestKind
        : undefined,
    targetEventId:
      typeof raw.targetEventId === "string" ? raw.targetEventId : undefined,
    pendingService:
      raw.pendingService && typeof raw.pendingService === "object"
        ? (raw.pendingService as BookedService)
        : undefined,
  };
}

export function rowToAvailabilityRequest(
  row: AvailabilityRequestRow,
): AvailabilityRequest {
  const status = REQUEST_STATUSES.has(row.status)
    ? row.status
    : "pending_manager";
  return {
    id: row.id,
    status,
    requesterUserId: row.requester_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email ?? undefined,
    locationId: row.location_id,
    locationName: row.location_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    eventPayload: asPayload(row.event_payload),
  };
}

export function bookingRowToUserEvent(row: BookingRow): UserEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    date: row.event_date,
    time: row.start_time,
    endTime: row.end_time || undefined,
    locationId: row.location_id ?? undefined,
    locationName: row.location_name,
    city: row.city,
    status:
      row.status === "confirmed" ||
      row.status === "completed" ||
      row.status === "draft"
        ? row.status
        : "organizing",
    guestCount: Number(row.guest_count) || 0,
    services: Array.isArray(row.services) ? row.services : [],
    totalCost: Number(row.total_cost) || 0,
    depositAmount: Number(row.deposit_amount) || 0,
    createdAt: row.created_at,
  };
}

async function resolveListingId(locationId: string): Promise<string | null> {
  if (!isUuid(locationId) || !isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("listings")
    .select("id")
    .eq("id", locationId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createAvailabilityRequest(params: {
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  locationId: string;
  locationName: string;
  eventPayload: AvailabilityEventPayload;
}): Promise<
  { ok: true; request: AvailabilityRequest } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }

  const listingId = await resolveListingId(params.locationId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("availability_requests")
    .insert({
      status: "pending_manager",
      requester_id: params.requesterId,
      requester_name: params.requesterName,
      requester_email: params.requesterEmail ?? null,
      location_id: params.locationId,
      listing_id: listingId,
      location_name: params.locationName,
      event_payload: params.eventPayload,
    })
    .select("*")
    .single();

  if (error || !data) {
    const raw = error?.message ?? "Creazione richiesta fallita.";
    const lower = raw.toLowerCase();
    if (lower.includes("invalid api key")) {
      return {
        ok: false,
        error:
          "Configurazione Supabase non valida sul server (API key). Controlla le variabili su Vercel e rifai il deploy.",
      };
    }
    if (
      lower.includes("permission denied") ||
      lower.includes("42501") ||
      lower.includes("grant")
    ) {
      return {
        ok: false,
        error:
          "Permessi database mancanti sulle tabelle bookings. Esegui docs/FIX_TABLE_GRANTS.sql su Supabase.",
      };
    }
    return { ok: false, error: raw };
  }

  return {
    ok: true,
    request: rowToAvailabilityRequest(data as AvailabilityRequestRow),
  };
}

export async function listAvailabilityRequestsForUser(params: {
  userId: string;
  role?: string;
  ownedLocationIds?: string[];
}): Promise<AvailabilityRequest[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  const owned = params.ownedLocationIds ?? [];
  const isAdmin = params.role === "admin";

  if (isAdmin) {
    const { data, error } = await supabase
      .from("availability_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error || !data) {
      console.error("[bookings] list admin", error?.message);
      return [];
    }
    return (data as AvailabilityRequestRow[]).map(rowToAvailabilityRequest);
  }

  const { data: asRequester, error: requesterError } = await supabase
    .from("availability_requests")
    .select("*")
    .eq("requester_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (requesterError) {
    console.error("[bookings] list requester", requesterError.message);
  }

  let asOwner: AvailabilityRequestRow[] = [];
  if (owned.length > 0) {
    const { data: ownerRows, error: ownerError } = await supabase
      .from("availability_requests")
      .select("*")
      .in("location_id", owned)
      .order("created_at", { ascending: false })
      .limit(80);
    if (ownerError) {
      console.error("[bookings] list owner", ownerError.message);
    } else {
      asOwner = (ownerRows ?? []) as AvailabilityRequestRow[];
    }
  }

  const byId = new Map<string, AvailabilityRequestRow>();
  for (const row of [
    ...((asRequester ?? []) as AvailabilityRequestRow[]),
    ...asOwner,
  ]) {
    byId.set(row.id, row);
  }

  return Array.from(byId.values())
    .sort(
      (a, b) =>
        Date.parse(b.created_at) - Date.parse(a.created_at) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 80)
    .map(rowToAvailabilityRequest);
}

export async function getAvailabilityRequest(
  requestId: string,
): Promise<AvailabilityRequestRow | null> {
  if (!isSupabaseConfigured() || !isUuid(requestId)) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("availability_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AvailabilityRequestRow;
}

export async function canManageLocationRequest(params: {
  userId: string;
  role?: string;
  locationId: string;
  listingId: string | null;
}): Promise<boolean> {
  if (params.role === "admin") return true;
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", params.userId)
    .maybeSingle();

  if (
    profile &&
    canAccessAdminCatalog(profile.email ?? "", profile.role as "admin" | null)
  ) {
    return true;
  }

  if (params.listingId) {
    const { data } = await supabase
      .from("listings")
      .select("owner_id")
      .eq("id", params.listingId)
      .maybeSingle();
    if (data?.owner_id === params.userId) return true;
  }

  if (isUuid(params.locationId)) {
    const { data } = await supabase
      .from("listings")
      .select("owner_id")
      .eq("id", params.locationId)
      .maybeSingle();
    if (data?.owner_id === params.userId) return true;
  }

  return false;
}

export async function updateAvailabilityRequestStatus(params: {
  requestId: string;
  nextStatus: AvailabilityRequestStatus;
  actorUserId: string;
  actorRole?: string;
}): Promise<
  { ok: true; request: AvailabilityRequest } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }

  const row = await getAvailabilityRequest(params.requestId);
  if (!row) return { ok: false, error: "Richiesta non trovata." };

  const isRequester = row.requester_id === params.actorUserId;
  const isManager = await canManageLocationRequest({
    userId: params.actorUserId,
    role: params.actorRole,
    locationId: row.location_id,
    listingId: row.listing_id,
  });

  const transitions: Record<
    AvailabilityRequestStatus,
    AvailabilityRequestStatus[]
  > = {
    pending_manager: ["pending_user_confirm", "declined", "cancelled"],
    pending_user_confirm: ["confirmed", "cancelled"],
    declined: [],
    confirmed: [],
    cancelled: [],
  };

  if (!transitions[row.status].includes(params.nextStatus)) {
    return { ok: false, error: "Transizione di stato non valida." };
  }

  if (
    (params.nextStatus === "pending_user_confirm" ||
      params.nextStatus === "declined") &&
    !isManager
  ) {
    return { ok: false, error: "Solo il gestore può rispondere." };
  }

  if (
    (params.nextStatus === "confirmed" || params.nextStatus === "cancelled") &&
    !isRequester &&
    params.actorRole !== "admin"
  ) {
    return { ok: false, error: "Solo il richiedente può aggiornare." };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("availability_requests")
    .update({ status: params.nextStatus })
    .eq("id", params.requestId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Aggiornamento fallito." };
  }

  return {
    ok: true,
    request: rowToAvailabilityRequest(data as AvailabilityRequestRow),
  };
}

export async function createBookingFromRequest(params: {
  request: AvailabilityRequest;
  organizerId: string;
}): Promise<{ ok: true; event: UserEvent } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }

  const payload = params.request.eventPayload;
  const listingId = await resolveListingId(payload.locationId);
  const supabase = getSupabaseAdmin();
  const bookingId = crypto.randomUUID();
  const services = payload.services.map((service) => ({
    ...service,
    id: service.id.startsWith("draft-")
      ? service.id.replace(/^draft-/, `${bookingId}-`)
      : `${bookingId}-${service.id}`,
  }));

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      id: bookingId,
      availability_request_id: isUuid(params.request.id)
        ? params.request.id
        : null,
      organizer_id: params.organizerId,
      status: "organizing",
      location_id: payload.locationId,
      listing_id: listingId,
      location_name: payload.locationName,
      title: payload.title,
      description: payload.description ?? "",
      event_date: payload.date,
      start_time: payload.time,
      end_time: payload.endTime ?? "",
      city: payload.city,
      guest_count: payload.guestCount,
      total_cost: payload.totalCost,
      deposit_amount: payload.depositAmount,
      services,
      deposit_due_at: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Creazione evento fallita." };
  }

  const booking = data as BookingRow;
  const feeAmount = roundCurrency(
    Number(booking.deposit_amount) * DEPOSIT_APP_FEE_RATE,
  );

  await supabase.from("booking_payments").upsert(
    {
      booking_id: booking.id,
      kind: "deposit",
      service_id: "",
      amount: Number(booking.deposit_amount) || 0,
      fee_amount: feeAmount,
      paid: false,
    },
    { onConflict: "booking_id,kind,service_id" },
  );

  return { ok: true, event: bookingRowToUserEvent(booking) };
}

export async function listBookingsForOrganizer(
  organizerId: string,
): Promise<UserEvent[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error || !data) {
    console.error("[bookings] listBookingsForOrganizer", error?.message);
    return [];
  }

  return (data as BookingRow[]).map(bookingRowToUserEvent);
}

export async function getProfileRole(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export async function listOwnedLocationIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("listings")
    .select("id")
    .eq("owner_id", userId);
  return (data ?? []).map((row) => row.id as string);
}
