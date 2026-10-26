import { saveDemoSubmission } from "@/lib/demo/submissions";
import { readDemoSession } from "@/lib/demo/session";

export const DEMO_STEP_FIELD = {
  entered: "stepEnteredAt",
  criteria: "stepCriteriaAt",
  location: "stepLocationAt",
  request: "stepRequestAt",
  event: "stepEventAt",
  rating: "stepRatingAt",
} as const;

export type DemoStepId = keyof typeof DEMO_STEP_FIELD;

function bagKey(sessionId: string) {
  return `vu-demo-steps:${sessionId}`;
}

function readBag(sessionId: string): Partial<Record<DemoStepId, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(bagKey(sessionId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<Record<DemoStepId, string>>) : {};
  } catch {
    return {};
  }
}

/** First time this step is reached, returns the timestamp. Later calls return null. */
export function claimDemoStep(sessionId: string, step: DemoStepId): string | null {
  const bag = readBag(sessionId);
  if (bag[step]) return null;
  const at = new Date().toISOString();
  bag[step] = at;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(bagKey(sessionId), JSON.stringify(bag));
    } catch {
      /* the payload write still happens once from this call */
    }
  }
  return at;
}

/** One optional table write for a step that does not already have its own save. */
export function markDemoStep(
  step: DemoStepId,
  extra?: Record<string, unknown>,
) {
  const session = readDemoSession();
  if (!session || session.completed) return;
  const at = claimDemoStep(session.id, step);
  if (!at && !extra) return;
  const field = DEMO_STEP_FIELD[step];
  void saveDemoSubmission({
    id: session.id,
    payload: {
      ...(at ? { [field]: at } : {}),
      ...extra,
    },
    optional: true,
  }).catch(() => undefined);
}
