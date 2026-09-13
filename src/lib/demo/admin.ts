import { parseDemoResponse } from "@/lib/demo/responses";
import type { DemoResponseRow } from "@/types/demo";

export async function fetchDemoResponses(): Promise<DemoResponseRow[]> {
  const response = await fetch("/api/demo/submissions", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as {
    data?: { id: string; payload: Record<string, unknown>; createdAt: string; updatedAt: string }[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "Non riesco a caricare le risposte demo.");
  }

  return (body.data ?? []).map((row) =>
    parseDemoResponse({
      id: row.id,
      payload: row.payload ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  );
}
