import { isVibeUpCode, normalizeCode } from "@/lib/launch/fields";

export const SIGNUP_DRAFT_KEY = "vu_signup_draft";
export const SIGNUP_REFERRAL_KEY = "vu_referral";

export type SignupDraft = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phonePrefix: string;
  phoneNational: string;
  birthYear: string;
  highSchool: string;
  dreamVenue: string;
  referralCode: string;
  referralSkipped: boolean;
  consentPrivacy: boolean;
  consentRules: boolean;
  consentMarketing: boolean;
  step: number;
  signupId: string;
  codeSentAt: number;
  codeSentFor: string;
  emailConfirmed: boolean;
  confirmedEmail: string;
  confirmedSignupId: string;
  flow: number;
};

export function readStoredSignupReferral() {
  return storedReferral();
}

function storedReferral() {
  if (typeof window === "undefined") return "";
  try {
    const value = normalizeCode(sessionStorage.getItem(SIGNUP_REFERRAL_KEY) ?? "");
    return isVibeUpCode(value) ? value : "";
  } catch {
    return "";
  }
}

/** Valid ?ref= on this page. Saved immediately so a later visit still has it. */
function urlReferral() {
  if (typeof window === "undefined") return "";
  try {
    const ref = normalizeCode(new URLSearchParams(window.location.search).get("ref") ?? "");
    if (!isVibeUpCode(ref)) return "";
    sessionStorage.setItem(SIGNUP_REFERRAL_KEY, ref);
    return ref;
  } catch {
    return "";
  }
}

function referralFromLocation() {
  return urlReferral() || storedReferral();
}

export function rememberSignupReferral(code: string) {
  const value = normalizeCode(code);
  if (!isVibeUpCode(value) || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SIGNUP_REFERRAL_KEY, value);
  } catch {
    /* private mode */
  }
}

export function emptySignupDraft(): SignupDraft {
  return {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phonePrefix: "+39",
    phoneNational: "",
    birthYear: "",
    highSchool: "",
    dreamVenue: "",
    referralCode: referralFromLocation(),
    referralSkipped: false,
    consentPrivacy: false,
    consentRules: false,
    consentMarketing: false,
    step: 0,
    signupId: "",
    codeSentAt: 0,
    codeSentFor: "",
    emailConfirmed: false,
    confirmedEmail: "",
    confirmedSignupId: "",
    flow: 2,
  };
}

export function loadSignupDraft(): SignupDraft {
  const base = emptySignupDraft();
  if (typeof window === "undefined") return base;
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SignupDraft>;
    const legacy = parsed.flow !== 2;
    let step = typeof parsed.step === "number" ? parsed.step : 0;
    if (legacy) {
      if (step === 2) step = 1;
      else if (step >= 9) step = 2;
    }
    const fromUrl = urlReferral();
    const skipped = parsed.referralSkipped === true && !fromUrl;
    const savedCode = typeof parsed.referralCode === "string" ? parsed.referralCode : "";
    return {
      ...base,
      ...parsed,
      phonePrefix: parsed.phonePrefix || "+39",
      referralSkipped: skipped,
      referralCode: fromUrl || (skipped ? "" : savedCode || storedReferral()),
      step: Math.min(8, Math.max(0, step)),
      signupId: typeof parsed.signupId === "string" ? parsed.signupId : "",
      codeSentAt: typeof parsed.codeSentAt === "number" ? parsed.codeSentAt : 0,
      codeSentFor: !legacy && typeof parsed.codeSentFor === "string" ? parsed.codeSentFor : "",
      emailConfirmed: !legacy && parsed.emailConfirmed === true,
      confirmedEmail: !legacy && typeof parsed.confirmedEmail === "string" ? parsed.confirmedEmail : "",
      confirmedSignupId: !legacy && typeof parsed.confirmedSignupId === "string" ? parsed.confirmedSignupId : "",
      flow: 2,
    };
  } catch {
    return base;
  }
}

export function saveSignupDraft(draft: SignupDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function clearSignupDraft() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
  } catch {
    /* private mode */
  }
}
