const SESSION_KEY = "vibeup-party-criteria-session-v1";
const PROFILE_KEY_PREFIX = "vibeup-party-criteria-profile-v1:";

function removeItem(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    /* private mode / quota */
  }
}

/** Search filters are in-memory only — drop leftovers from older builds. */
export function forgetPersistedPartyCriteria() {
  if (typeof window === "undefined") return;

  removeItem(window.sessionStorage, SESSION_KEY);

  try {
    const staleKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(PROFILE_KEY_PREFIX)) staleKeys.push(key);
    }
    for (const key of staleKeys) removeItem(window.localStorage, key);
  } catch {
    /* private mode / quota */
  }
}

export function clearPartyCriteriaProfile(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  removeItem(window.localStorage, `${PROFILE_KEY_PREFIX}${userId}`);
}
