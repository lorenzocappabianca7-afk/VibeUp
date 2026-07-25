/** Purge per-user satellite localStorage left outside vibeup-app-state-v2. */

const PROFILE_COMMS_PREFIX = "vibeup-profile-comms-v1:";
const CHAT_PREFIX = "vibeup-chat-v1:";
const AVAILABILITY_KEY = "vibeup-availability-requests-v1";

export function purgeUserSatelliteStorage(userId: string) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.removeItem(`${PROFILE_COMMS_PREFIX}${userId}`);
  } catch {
    // private mode / quota
  }

  try {
    window.localStorage.removeItem(`${CHAT_PREFIX}${userId}`);
  } catch {
    // private mode / quota
  }

  try {
    const raw = window.localStorage.getItem(AVAILABILITY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    const next = parsed.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const requesterId = (item as { requesterUserId?: unknown }).requesterUserId;
      return requesterId !== userId;
    });
    window.localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota / parse
  }
}
