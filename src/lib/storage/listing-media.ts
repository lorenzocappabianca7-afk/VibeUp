import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const LISTING_MEDIA_BUCKET = "listing-media";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function isAllowedListingImage(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Formato non supportato. Usa JPG, PNG, WebP o GIF.";
  }
  if (file.size > MAX_BYTES) {
    return "Ogni foto deve pesare al massimo 5 MB.";
  }
  return null;
}

export async function uploadListingImage(params: {
  bytes: ArrayBuffer | Buffer | Uint8Array;
  contentType: string;
  folder?: string;
  fileName?: string;
}): Promise<
  { ok: true; publicUrl: string; storagePath: string } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }

  const typeError = isAllowedListingImage({
    type: params.contentType,
    size:
      params.bytes instanceof ArrayBuffer
        ? params.bytes.byteLength
        : params.bytes.byteLength,
  });
  if (typeError) return { ok: false, error: typeError };

  const folder = (params.folder || "drafts").replace(/[^a-zA-Z0-9/_-]/g, "");
  const ext = extensionForMime(params.contentType);
  const storagePath = `${folder}/${params.fileName ?? crypto.randomUUID()}.${ext}`;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(LISTING_MEDIA_BUCKET)
      .upload(storagePath, params.bytes, {
        contentType: params.contentType,
        upsert: false,
        cacheControl: "31536000",
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data } = supabase.storage
      .from(LISTING_MEDIA_BUCKET)
      .getPublicUrl(storagePath);

    return {
      ok: true,
      publicUrl: data.publicUrl,
      storagePath,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload non riuscito.";
    return { ok: false, error: message };
  }
}

export async function syncListingMediaRows(params: {
  listingId: string;
  imageUrls: string[];
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseAdmin();
  await supabase.from("listing_media").delete().eq("listing_id", params.listingId);

  const rows = params.imageUrls
    .filter((url) => typeof url === "string" && url.startsWith("http"))
    .map((publicUrl, index) => ({
      listing_id: params.listingId,
      storage_path: publicUrl.includes("/listing-media/")
        ? publicUrl.split("/listing-media/")[1] ?? publicUrl
        : publicUrl,
      public_url: publicUrl,
      sort_order: index,
      is_cover: index === 0,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("listing_media").insert(rows);
  if (error) {
    console.error("[listing-media] sync rows", error.message);
  }
}
