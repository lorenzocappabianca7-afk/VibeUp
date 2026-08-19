import {
  emptyPartyCriteria,
  normalizePartyCriteria,
  partyCriteriaHasAny,
  type PartyCriteria,
} from "@/types/party-criteria";

const SESSION_KEY = "vibeup-party-criteria-session-v1";
const PROFILE_KEY_PREFIX = "vibeup-party-criteria-profile-v1:";

interface StoredPartyCriteria {
  v: 1;
  hasApplied: boolean;
  criteria: PartyCriteria;
}

function profileKey(userId: string) {
  return `${PROFILE_KEY_PREFIX}${userId}`;
}

function parseStored(raw: string | null): StoredPartyCriteria | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPartyCriteria>;
    if (!parsed || typeof parsed !== "object") return null;
    const criteria = normalizePartyCriteria(parsed.criteria);
    const hasApplied =
      parsed.hasApplied === true || partyCriteriaHasAny(criteria);
    return { v: 1, hasApplied, criteria };
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: StoredPartyCriteria) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode / quota
  }
}

export function readPartyCriteriaSession(): StoredPartyCriteria | null {
  if (typeof window === "undefined") return null;
  return parseStored(window.sessionStorage.getItem(SESSION_KEY));
}

export function writePartyCriteriaSession(input: {
  criteria: PartyCriteria;
  hasApplied: boolean;
}) {
  if (typeof window === "undefined") return;
  writeJson(window.sessionStorage, SESSION_KEY, {
    v: 1,
    hasApplied: input.hasApplied,
    criteria: normalizePartyCriteria(input.criteria),
  });
}

export function clearPartyCriteriaSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function readPartyCriteriaProfile(
  userId: string,
): StoredPartyCriteria | null {
  if (typeof window === "undefined" || !userId) return null;
  return parseStored(window.localStorage.getItem(profileKey(userId)));
}

export function writePartyCriteriaProfile(
  userId: string,
  input: { criteria: PartyCriteria; hasApplied: boolean },
) {
  if (typeof window === "undefined" || !userId) return;
  writeJson(window.localStorage, profileKey(userId), {
    v: 1,
    hasApplied: input.hasApplied,
    criteria: normalizePartyCriteria(input.criteria),
  });
}

export function clearPartyCriteriaProfile(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(profileKey(userId));
  } catch {
    /* ignore */
  }
}

export function hydratePartyCriteria(userId: string | null): StoredPartyCriteria {
  const session = readPartyCriteriaSession();
  if (session?.hasApplied) return session;

  if (userId) {
    const profile = readPartyCriteriaProfile(userId);
    if (profile?.hasApplied) {
      writePartyCriteriaSession(profile);
      return profile;
    }
  }

  return {
    v: 1,
    hasApplied: false,
    criteria: emptyPartyCriteria,
  };
}
