import type {
  AvailabilityEventPayload,
  AvailabilityRequest,
} from "@/types/availability-request";
import type { UserEvent } from "@/types/event";

type Action =
  | "accept"
  | "decline"
  | "confirm"
  | "confirm_proposal"
  | "reject_proposal"
  | "cancel";

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
}

export async function fetchAvailabilityRequests(): Promise<{
  ok: boolean;
  configured: boolean;
  requests: AvailabilityRequest[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/bookings/requests", {
      method: "GET",
      credentials: "same-origin",
    });
    const payload = await parseJson(response);
    if (!response.ok) {
      return {
        ok: false,
        configured: Boolean(payload?.configured),
        requests: [],
        error:
          typeof payload?.error === "string"
            ? payload.error
            : "Caricamento richieste fallito.",
      };
    }
    return {
      ok: true,
      configured: Boolean(payload?.configured),
      requests: Array.isArray(payload?.requests)
        ? (payload.requests as AvailabilityRequest[])
        : [],
    };
  } catch {
    return {
      ok: false,
      configured: false,
      requests: [],
      error: "Connessione non disponibile.",
    };
  }
}

export async function createAvailabilityRequestRemote(input: {
  locationId: string;
  locationName: string;
  eventPayload: AvailabilityEventPayload;
}): Promise<
  | { ok: true; request: AvailabilityRequest }
  | { ok: false; error: string; configured?: boolean }
> {
  try {
    const response = await fetch("/api/bookings/requests", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await parseJson(response);
    if (!response.ok) {
      return {
        ok: false,
        configured: Boolean(payload?.configured),
        error:
          typeof payload?.error === "string"
            ? payload.error
            : "Invio richiesta fallito.",
      };
    }
    if (!payload?.request || typeof payload.request !== "object") {
      return { ok: false, error: "Risposta richiesta non valida." };
    }
    return { ok: true, request: payload.request as AvailabilityRequest };
  } catch {
    return { ok: false, error: "Connessione non disponibile." };
  }
}

export async function patchAvailabilityRequestRemote(params: {
  requestId: string;
  action: Action;
  selectedDate?: string;
  selectedPrice?: number | null;
}): Promise<
  | { ok: true; request: AvailabilityRequest; event?: UserEvent }
  | { ok: false; error: string }
> {
  try {
    const response = await fetch(
      `/api/bookings/requests/${encodeURIComponent(params.requestId)}`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: params.action,
          ...(params.selectedDate !== undefined
            ? { selectedDate: params.selectedDate }
            : {}),
          ...(params.selectedPrice !== undefined
            ? { selectedPrice: params.selectedPrice }
            : {}),
        }),
      },
    );
    const payload = await parseJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error:
          typeof payload?.error === "string"
            ? payload.error
            : "Aggiornamento richiesta fallito.",
      };
    }
    if (!payload?.request || typeof payload.request !== "object") {
      return { ok: false, error: "Risposta aggiornamento non valida." };
    }
    return {
      ok: true,
      request: payload.request as AvailabilityRequest,
      event:
        payload.event && typeof payload.event === "object"
          ? (payload.event as UserEvent)
          : undefined,
    };
  } catch {
    return { ok: false, error: "Connessione non disponibile." };
  }
}

export async function adminReviewAvailabilityRequestRemote(params: {
  requestId: string;
  action: "forward" | "discard";
  adminNote?: string | null;
}): Promise<
  { ok: true; request: AvailabilityRequest } | { ok: false; error: string }
> {
  try {
    const response = await fetch(
      `/api/bookings/requests/${encodeURIComponent(params.requestId)}/admin-review`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: params.action,
          adminNote: params.adminNote ?? null,
        }),
      },
    );
    const payload = await parseJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error:
          typeof payload?.error === "string"
            ? payload.error
            : "Revisione admin fallita.",
      };
    }
    if (!payload?.request || typeof payload.request !== "object") {
      return { ok: false, error: "Risposta revisione non valida." };
    }
    return { ok: true, request: payload.request as AvailabilityRequest };
  } catch {
    return { ok: false, error: "Connessione non disponibile." };
  }
}
