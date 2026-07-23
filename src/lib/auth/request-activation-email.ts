"use client";

export async function requestActivationEmail(input: {
  email: string;
  name: string;
  token: string;
}) {
  const response = await fetch("/api/auth/send-activation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false as const,
      error: body.error ?? "Invio email non riuscito.",
    };
  }

  return { ok: true as const };
}
