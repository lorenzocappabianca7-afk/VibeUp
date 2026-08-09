/** Browser helper: upload listing photos via /api/catalog/media → Supabase Storage. */

export async function uploadListingPhotos(
  files: FileList | File[] | null | undefined,
  options?: { folder?: string },
): Promise<{ ok: true; urls: string[] } | { ok: false; error: string }> {
  const list = Array.from(files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
  if (list.length === 0) {
    return { ok: false, error: "Seleziona almeno un’immagine." };
  }

  const body = new FormData();
  body.set("folder", options?.folder ?? "drafts");
  for (const file of list) {
    body.append("files", file, file.name);
  }

  try {
    const response = await fetch("/api/catalog/media", {
      method: "POST",
      body,
    });
    const payload = (await response.json().catch(() => null)) as {
      urls?: string[];
      error?: string;
    } | null;

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.error ?? "Upload non riuscito.",
      };
    }

    const urls = Array.isArray(payload?.urls) ? payload.urls : [];
    if (urls.length === 0) {
      return { ok: false, error: "Nessuna URL restituita dallo storage." };
    }

    return { ok: true, urls };
  } catch {
    return { ok: false, error: "Connessione allo storage non disponibile." };
  }
}
