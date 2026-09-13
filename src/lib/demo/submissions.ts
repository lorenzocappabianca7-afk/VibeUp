import { isDemoMode } from "@/lib/demo/mode";
import type { DemoSubmission, DemoSubmissionPayload } from "@/types/demo";

/**
 * Client-safe write to the isolated demo table.
 * No-op when the flag is off — real booking/profile APIs are never called.
 */
export async function saveDemoSubmission(input: {
  payload?: DemoSubmissionPayload;
  id?: string;
  /** Intermediate demo writes: keep the local flow going if the table write fails. */
  optional?: boolean;
} = {}): Promise<DemoSubmission | null> {
  if (!isDemoMode()) return null;

  const response = await fetch("/api/demo/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.id,
      payload: input.payload ?? {},
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    data?: DemoSubmission;
    error?: string;
  };

  if (!response.ok) {
    if (input.optional) return null;
    const raw = body.error ?? "Non riesco a salvare i dati della demo. Riprova.";
    if (raw.includes("demo_submissions")) {
      throw new Error(
        "Tabella demo non trovata. Esegui docs/DEMO_SCHEMA.sql in Supabase, poi riprova.",
      );
    }
    throw new Error(raw);
  }

  return body.data ?? null;
}
