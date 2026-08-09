import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { uploadListingImage } from "@/lib/storage/listing-media";
import { rateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "catalog-media-upload",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Form data non valido." },
      { status: 400 },
    );
  }

  const folderRaw = String(formData.get("folder") ?? "drafts");
  const folder = folderRaw.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 120) || "drafts";
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Nessuna foto da caricare." },
      { status: 400 },
    );
  }

  if (files.length > 8) {
    return NextResponse.json(
      { error: "Massimo 8 foto per volta." },
      { status: 400 },
    );
  }

  const urls: string[] = [];
  const paths: string[] = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const result = await uploadListingImage({
      bytes,
      contentType: file.type || "image/jpeg",
      folder,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    urls.push(result.publicUrl);
    paths.push(result.storagePath);
  }

  return NextResponse.json({
    ok: true,
    urls,
    paths,
    count: urls.length,
  });
}
