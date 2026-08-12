import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import {
  DEPOSIT_APP_FEE_RATE,
  roundCurrency,
} from "@/lib/booking-money";
import {
  computeConfirmationDeadline,
  CONFIRMATION_REMINDER_WINDOW_MS,
} from "@/lib/availability/confirmation-deadline";
import { notifyManagerAboutAvailabilityRequest } from "@/server/notifications/availability-request-notify";
import { randomBytes } from "crypto";
import type {
  AvailabilityEventPayload,
  AvailabilityRequest,
  AvailabilityRequestStatus,
  ManagerDecision,
  ManagerProposedDate,
} from "@/types/availability-request";
import type { BookedService, UserEvent } from "@/types/event";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REQUEST_STATUSES = new Set<AvailabilityRequestStatus>([
  "pending_manager",
  "declined",
  "pending_user_confirm",
  "pending_admin_review",
  "pending_user_review_proposal",
  "confirmed",
  "cancelled",
  "expired",
]);

const MANAGER_DECISIONS = new Set<ManagerDecision>([
  "accept",
  "decline",
  "propose",
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
  manager_decision?: string | null;
  manager_note?: string | null;
  manager_proposed_dates?: unknown;
  manager_proposed_price?: number | string | null;
  manager_responded_at?: string | null;
  response_token?: string | null;
  response_token_expires_at?: string | null;
  response_token_used_at?: string | null;
  admin_reviewed_by?: string | null;
  admin_reviewed_at?: string | null;
  admin_note?: string | null;
  user_selected_date?: string | null;
  user_selected_price?: number | string | null;
  confirmation_deadline?: string | null;
  confirmation_reminder_sent_at?: string | null;
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

function asManagerDecision(value: unknown): ManagerDecision | null {
  return typeof value === "string" &&
    MANAGER_DECISIONS.has(value as ManagerDecision)
    ? (value as ManagerDecision)
    : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asProposedDates(value: unknown): ManagerProposedDate[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const dates: ManagerProposedDate[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const date = typeof raw.date === "string" ? raw.date.trim() : "";
    if (!date) continue;
    dates.push({
      date,
      time: typeof raw.time === "string" ? raw.time : undefined,
      endTime: typeof raw.endTime === "string" ? raw.endTime : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
    });
  }
  return dates.length > 0 ? dates : null;
}

function asResponseToken(row: AvailabilityRequestRow): string {
  if (typeof row.response_token === "string" && row.response_token.length > 0) {
    return row.response_token;
  }
  // Pre-V2 rows should be backfilled by BOOKINGS_SCHEMA_V2.sql; keep mapping safe.
  return row.id;
}

function asResponseTokenExpiresAt(row: AvailabilityRequestRow): string {
  if (
    typeof row.response_token_expires_at === "string" &&
    row.response_token_expires_at.length > 0
  ) {
    return row.response_token_expires_at;
  }
  const created = Date.parse(row.created_at);
  if (Number.isFinite(created)) {
    return new Date(created + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
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
    managerDecision: asManagerDecision(row.manager_decision),
    managerNote: asNullableString(row.manager_note),
    managerProposedDates: asProposedDates(row.manager_proposed_dates),
    managerProposedPrice: asNullableNumber(row.manager_proposed_price),
    managerRespondedAt: asNullableString(row.manager_responded_at),
    responseToken: asResponseToken(row),
    responseTokenExpiresAt: asResponseTokenExpiresAt(row),
    responseTokenUsedAt: asNullableString(row.response_token_used_at),
    adminReviewedBy: asNullableString(row.admin_reviewed_by),
    adminReviewedAt: asNullableString(row.admin_reviewed_at),
    adminNote: asNullableString(row.admin_note),
    userSelectedDate: asNullableString(row.user_selected_date),
    userSelectedPrice: asNullableNumber(row.user_selected_price),
    confirmationDeadline: asNullableString(row.confirmation_deadline),
    confirmationReminderSentAt: asNullableString(
      row.confirmation_reminder_sent_at,
    ),
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

function createResponseTokenPair(): {
  responseToken: string;
  responseTokenExpiresAt: string;
} {
  return {
    // 48 hex chars (>= 32), URL-safe
    responseToken: randomBytes(24).toString("hex"),
    responseTokenExpiresAt: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
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
  const { responseToken, responseTokenExpiresAt } = createResponseTokenPair();
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
      response_token: responseToken,
      response_token_expires_at: responseTokenExpiresAt,
      response_token_used_at: null,
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

  const request = rowToAvailabilityRequest(data as AvailabilityRequestRow);

  // Notification is best-effort: request already exists even if notify fails.
  const notify = await notifyManagerAboutAvailabilityRequest(
    request,
    listingId,
  );
  if (!notify.ok) {
    console.error(
      "[bookings] notifica gestore non inviata per",
      request.id,
      notify.error,
    );
  }

  return {
    ok: true,
    request,
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

export type AvailabilityTokenAccess =
  | { status: "ok"; request: AvailabilityRequest; row: AvailabilityRequestRow }
  | { status: "missing" | "expired" | "used" };

/**
 * Public token lookup for /r/[token] (service-role). Does not consume the token.
 */
export async function getAvailabilityRequestByToken(
  token: string,
): Promise<AvailabilityTokenAccess> {
  const trimmed = token.trim();
  if (!trimmed || !isSupabaseConfigured()) return { status: "missing" };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("availability_requests")
    .select("*")
    .eq("response_token", trimmed)
    .maybeSingle();

  if (error || !data) return { status: "missing" };

  const row = data as AvailabilityRequestRow;
  if (row.response_token_used_at) return { status: "used" };

  const expiresAt = Date.parse(
    typeof row.response_token_expires_at === "string"
      ? row.response_token_expires_at
      : "",
  );
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return { status: "expired" };
  }

  if (row.status !== "pending_manager") {
    // Already answered through another path.
    return { status: "used" };
  }

  return {
    status: "ok",
    request: rowToAvailabilityRequest(row),
    row,
  };
}

export type ManagerRespondAction = "accept" | "decline" | "propose";

export async function respondToAvailabilityRequestByToken(params: {
  token: string;
  action: ManagerRespondAction;
  managerNote?: string | null;
  proposedDates?: ManagerProposedDate[] | null;
  proposedPrice?: number | null;
}): Promise<
  { ok: true; request: AvailabilityRequest } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }

  const access = await getAvailabilityRequestByToken(params.token);
  if (access.status !== "ok") {
    if (access.status === "expired") {
      return { ok: false, error: "Link scaduto." };
    }
    if (access.status === "used") {
      return { ok: false, error: "Link già utilizzato." };
    }
    return { ok: false, error: "Link non valido." };
  }

  const now = new Date().toISOString();
  const note =
    typeof params.managerNote === "string" && params.managerNote.trim()
      ? params.managerNote.trim().slice(0, 2000)
      : null;

  let nextStatus: AvailabilityRequestStatus;
  let decision: ManagerDecision;
  let proposedDates: ManagerProposedDate[] | null = null;
  let proposedPrice: number | null = null;

  if (params.action === "accept") {
    nextStatus = "pending_user_confirm";
    decision = "accept";
  } else if (params.action === "decline") {
    nextStatus = "declined";
    decision = "decline";
  } else {
    const dates = Array.isArray(params.proposedDates)
      ? params.proposedDates.filter(
          (item) => item && typeof item.date === "string" && item.date.trim(),
        )
      : [];
    if (dates.length === 0 && params.proposedPrice == null && !note) {
      return {
        ok: false,
        error:
          "Per proporre una modifica indica almeno una data, un prezzo o una nota.",
      };
    }
    nextStatus = "pending_admin_review";
    decision = "propose";
    proposedDates = dates.length > 0 ? dates : null;
    proposedPrice =
      typeof params.proposedPrice === "number" &&
      Number.isFinite(params.proposedPrice) &&
      params.proposedPrice >= 0
        ? params.proposedPrice
        : null;
  }

  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    status: nextStatus,
    manager_decision: decision,
    manager_note: note,
    manager_proposed_dates: proposedDates,
    manager_proposed_price: proposedPrice,
    manager_responded_at: now,
    response_token_used_at: now,
  };
  if (params.action === "accept") {
    patch.confirmation_deadline = computeConfirmationDeadline(new Date(now));
    patch.confirmation_reminder_sent_at = null;
  }

  const { data, error } = await supabase
    .from("availability_requests")
    .update(patch)
    .eq("id", access.row.id)
    .eq("response_token", params.token.trim())
    .is("response_token_used_at", null)
    .eq("status", "pending_manager")
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return {
      ok: false,
      error: "La richiesta è già stata gestita o il link non è più valido.",
    };
  }

  const request = rowToAvailabilityRequest(data as AvailabilityRequestRow);

  if (params.action === "accept" || params.action === "decline") {
    try {
      const { notifyOrganizerOfManagerDecision } = await import(
        "@/server/notifications/organizer-notifier"
      );
      const notify = await notifyOrganizerOfManagerDecision(request);
      if (!notify.ok) {
        console.error(
          "[bookings] notifyOrganizerOfManagerDecision failed",
          request.id,
          notify.error,
        );
      }
    } catch (err) {
      console.error(
        "[bookings] notifyOrganizerOfManagerDecision exception",
        request.id,
        err,
      );
    }
  }

  return { ok: true, request };
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
  userSelectedDate?: string | null;
  userSelectedPrice?: number | null;
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
    pending_manager: [
      "pending_user_confirm",
      "pending_admin_review",
      "declined",
      "cancelled",
    ],
    pending_admin_review: [
      "pending_user_review_proposal",
      "declined",
      "cancelled",
    ],
    pending_user_review_proposal: [
      "confirmed",
      "declined",
      "cancelled",
      "expired",
    ],
    pending_user_confirm: ["confirmed", "cancelled", "expired"],
    declined: [],
    confirmed: [],
    cancelled: [],
    expired: [],
  };

  if (!transitions[row.status].includes(params.nextStatus)) {
    return { ok: false, error: "Transizione di stato non valida." };
  }

  const requesterRejectingProposal =
    params.nextStatus === "declined" &&
    row.status === "pending_user_review_proposal" &&
    isRequester;

  if (
    (params.nextStatus === "pending_user_confirm" ||
      params.nextStatus === "declined") &&
    !isManager &&
    !requesterRejectingProposal
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

  const patch: Record<string, unknown> = { status: params.nextStatus };
  if (params.userSelectedDate !== undefined) {
    patch.user_selected_date = params.userSelectedDate;
  }
  if (params.userSelectedPrice !== undefined) {
    patch.user_selected_price = params.userSelectedPrice;
  }
  if (params.nextStatus === "pending_user_confirm") {
    patch.confirmation_deadline = computeConfirmationDeadline();
    patch.confirmation_reminder_sent_at = null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("availability_requests")
    .update(patch)
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
  /** When confirming a manager proposal, use the organizer's chosen slot/price. */
  override?: {
    date?: string;
    time?: string;
    endTime?: string;
    totalCost?: number;
  };
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

  const eventDate = params.override?.date ?? payload.date;
  const startTime = params.override?.time ?? payload.time;
  const endTime = params.override?.endTime ?? payload.endTime ?? "";
  const totalCost =
    typeof params.override?.totalCost === "number"
      ? params.override.totalCost
      : payload.totalCost;

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
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      city: payload.city,
      guest_count: payload.guestCount,
      total_cost: totalCost,
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

export type AdminReviewAction = "forward" | "discard";

/**
 * Admin validates a manager proposal (pending_admin_review).
 * forward → pending_user_review_proposal; discard → declined.
 */
export async function adminReviewAvailabilityRequest(params: {
  requestId: string;
  action: AdminReviewAction;
  adminUserId: string;
  adminRole?: string | null;
  adminEmail?: string | null;
  adminNote?: string | null;
}): Promise<
  { ok: true; request: AvailabilityRequest } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }
  if (!isUuid(params.requestId)) {
    return { ok: false, error: "ID richiesta non valido." };
  }

  if (
    !canAccessAdminCatalog(params.adminEmail ?? "", params.adminRole as "admin" | null)
  ) {
    return { ok: false, error: "Solo gli admin possono validare le proposte." };
  }

  const row = await getAvailabilityRequest(params.requestId);
  if (!row) return { ok: false, error: "Richiesta non trovata." };
  if (row.status !== "pending_admin_review") {
    return {
      ok: false,
      error: "La richiesta non è in attesa di revisione admin.",
    };
  }

  const now = new Date().toISOString();
  const note =
    typeof params.adminNote === "string" && params.adminNote.trim()
      ? params.adminNote.trim().slice(0, 2000)
      : null;

  const nextStatus: AvailabilityRequestStatus =
    params.action === "forward" ? "pending_user_review_proposal" : "declined";

  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    status: nextStatus,
    admin_reviewed_by: params.adminUserId,
    admin_reviewed_at: now,
    admin_note: note,
  };
  if (params.action === "forward") {
    patch.confirmation_deadline = computeConfirmationDeadline(new Date(now));
    patch.confirmation_reminder_sent_at = null;
  }

  const { data, error } = await supabase
    .from("availability_requests")
    .update(patch)
    .eq("id", params.requestId)
    .eq("status", "pending_admin_review")
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return {
      ok: false,
      error: "La richiesta non è più in revisione admin.",
    };
  }

  const request = rowToAvailabilityRequest(data as AvailabilityRequestRow);

  try {
    if (params.action === "forward") {
      const { notifyOrganizerOfProposal } = await import(
        "@/server/notifications/organizer-notifier"
      );
      const notify = await notifyOrganizerOfProposal(request);
      if (!notify.ok) {
        console.error(
          "[bookings] notifyOrganizerOfProposal failed",
          request.id,
          notify.error,
        );
      }
    } else {
      const { notifyOrganizerOfManagerDecision } = await import(
        "@/server/notifications/organizer-notifier"
      );
      const notify = await notifyOrganizerOfManagerDecision(request);
      if (!notify.ok) {
        console.error(
          "[bookings] notifyOrganizerOfManagerDecision failed",
          request.id,
          notify.error,
        );
      }
    }
  } catch (err) {
    console.error("[bookings] admin review notify exception", request.id, err);
  }

  return { ok: true, request };
}

/**
 * Admin / ops: re-send the manager notification for an existing request.
 * Extends response_token_expires_at by 7 days if already expired and clears used_at.
 */
export async function resendAvailabilityRequestNotification(
  requestId: string,
): Promise<{ ok: boolean; error?: string; channel?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }
  if (!isUuid(requestId)) {
    return { ok: false, error: "ID richiesta non valido." };
  }

  const row = await getAvailabilityRequest(requestId);
  if (!row) {
    return { ok: false, error: "Richiesta non trovata." };
  }

  let request = rowToAvailabilityRequest(row);
  const expiresAt = Date.parse(request.responseTokenExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    const nextExpires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("availability_requests")
      .update({
        response_token_expires_at: nextExpires,
        response_token_used_at: null,
      })
      .eq("id", requestId)
      .select("*")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: `Impossibile rinnovare il token: ${error.message}`,
      };
    }
    if (data) {
      request = rowToAvailabilityRequest(data as AvailabilityRequestRow);
    } else {
      request = {
        ...request,
        responseTokenExpiresAt: nextExpires,
        responseTokenUsedAt: null,
      };
    }
  }

  return notifyManagerAboutAvailabilityRequest(
    request,
    row.listing_id ?? null,
  );
}

/**
 * Cron: expire overdue confirmation holds and send near-deadline reminders.
 * Marks status → expired (frees the soft-held slot for that request).
 */
export async function processConfirmationDeadlines(now = new Date()): Promise<{
  expired: number;
  reminded: number;
  errors: string[];
}> {
  if (!isSupabaseConfigured()) {
    return { expired: 0, reminded: 0, errors: ["Supabase non configurato."] };
  }

  const supabase = getSupabaseAdmin();
  const nowIso = now.toISOString();
  const reminderHorizon = new Date(
    now.getTime() + CONFIRMATION_REMINDER_WINDOW_MS,
  ).toISOString();
  const errors: string[] = [];
  let expired = 0;
  let reminded = 0;

  const awaitingStatuses = [
    "pending_user_confirm",
    "pending_user_review_proposal",
  ] as const;

  const { data: overdueRows, error: overdueError } = await supabase
    .from("availability_requests")
    .select("*")
    .in("status", [...awaitingStatuses])
    .not("confirmation_deadline", "is", null)
    .lt("confirmation_deadline", nowIso)
    .limit(80);

  if (overdueError) {
    errors.push(`expire query: ${overdueError.message}`);
  } else {
    for (const row of (overdueRows ?? []) as AvailabilityRequestRow[]) {
      const { data, error } = await supabase
        .from("availability_requests")
        .update({ status: "expired" })
        .eq("id", row.id)
        .in("status", [...awaitingStatuses])
        .select("*")
        .maybeSingle();

      if (error) {
        errors.push(`expire ${row.id}: ${error.message}`);
        continue;
      }
      if (!data) continue;
      expired += 1;

      try {
        const { notifyOrganizerConfirmationExpired } = await import(
          "@/server/notifications/organizer-notifier"
        );
        const request = rowToAvailabilityRequest(data as AvailabilityRequestRow);
        const notify = await notifyOrganizerConfirmationExpired(request);
        if (!notify.ok) {
          errors.push(`expire notify ${row.id}: ${notify.error ?? "failed"}`);
        }
      } catch (err) {
        errors.push(
          `expire notify ${row.id}: ${
            err instanceof Error ? err.message : "exception"
          }`,
        );
      }
    }
  }

  const { data: reminderRows, error: reminderError } = await supabase
    .from("availability_requests")
    .select("*")
    .in("status", [...awaitingStatuses])
    .not("confirmation_deadline", "is", null)
    .gt("confirmation_deadline", nowIso)
    .lte("confirmation_deadline", reminderHorizon)
    .is("confirmation_reminder_sent_at", null)
    .limit(80);

  if (reminderError) {
    errors.push(`reminder query: ${reminderError.message}`);
  } else {
    for (const row of (reminderRows ?? []) as AvailabilityRequestRow[]) {
      const request = rowToAvailabilityRequest(row);
      try {
        const { notifyOrganizerConfirmationReminder } = await import(
          "@/server/notifications/organizer-notifier"
        );
        const notify = await notifyOrganizerConfirmationReminder(request);
        if (!notify.ok) {
          console.warn(
            "[processConfirmationDeadlines] reminder notify",
            row.id,
            notify.error,
          );
        }
      } catch (err) {
        errors.push(
          `reminder ${row.id}: ${
            err instanceof Error ? err.message : "exception"
          }`,
        );
      }

      // Mark sent even if email is still placeholder — avoids hourly spam.
      const { error: markError } = await supabase
        .from("availability_requests")
        .update({ confirmation_reminder_sent_at: nowIso })
        .eq("id", row.id)
        .is("confirmation_reminder_sent_at", null);

      if (markError) {
        errors.push(`reminder mark ${row.id}: ${markError.message}`);
        continue;
      }
      reminded += 1;
    }
  }

  return { expired, reminded, errors };
}
