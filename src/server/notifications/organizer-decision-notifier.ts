import type { AvailabilityRequest } from "@/types/availability-request";

/**
 * Placeholder — Prompt 7 will wire in-app + email notification to the organizer
 * when the manager accepts or declines via the public token link.
 */
export async function notifyOrganizerOfManagerDecision(
  request: AvailabilityRequest,
): Promise<{ ok: boolean; error?: string }> {
  console.info(
    "[notifyOrganizerOfManagerDecision] placeholder",
    {
      requestId: request.id,
      status: request.status,
      decision: request.managerDecision,
      requesterUserId: request.requesterUserId,
    },
  );
  return { ok: true };
}
