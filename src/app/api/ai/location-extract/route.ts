import { NextResponse, type NextRequest } from "next/server";
import { extractAndSaveSmartLocation } from "@/server/services/location-extraction";
import { rateLimit } from "@/server/http/rate-limit";
import {
  limitText,
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";
import type {
  SmartLocationInputSource,
  SmartLocationSourceKind,
} from "@/server/services/smart-location-types";

export const runtime = "nodejs";

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && "arrayBuffer" in value && "type" in value;
}

function toDataUrl(file: File, buffer: Buffer): string {
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

async function fileToSource(
  file: File,
  fallbackKind: SmartLocationSourceKind,
): Promise<SmartLocationInputSource> {
  if (file.size > REQUEST_LIMITS.maxUploadBytes) {
    throw new Error(`File troppo grande: ${file.name}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isImage = file.type.startsWith("image/");
  const isText =
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".md");

  return {
    kind: isImage ? "photo" : fallbackKind,
    fileName: file.name,
    mimeType: file.type,
    content: isText
      ? limitText(buffer.toString("utf8"), REQUEST_LIMITS.aiTextChars)
      : `File ricevuto: ${file.name} (${file.type || "mime sconosciuto"}).`,
    dataUrl: isImage ? toDataUrl(file, buffer) : undefined,
  };
}

async function parseJsonSources(request: NextRequest): Promise<SmartLocationInputSource[]> {
  const body = (await request.json()) as {
    text?: string;
    email?: string;
    sources?: SmartLocationInputSource[];
  };
  const sources = body.sources ?? [];

  if (body.text) {
    sources.push({
      kind: "text",
      content: limitText(body.text, REQUEST_LIMITS.aiTextChars),
    });
  }
  if (body.email) {
    sources.push({
      kind: "email",
      content: limitText(body.email, REQUEST_LIMITS.aiTextChars),
    });
  }

  return sources;
}

async function parseFormSources(request: NextRequest): Promise<SmartLocationInputSource[]> {
  const formData = await request.formData();
  const sources: SmartLocationInputSource[] = [];
  const text = formData.get("text");
  const email = formData.get("email");

  if (typeof text === "string" && text.trim()) {
    sources.push({
      kind: "text",
      content: limitText(text, REQUEST_LIMITS.aiTextChars),
    });
  }
  if (typeof email === "string" && email.trim()) {
    sources.push({
      kind: "email",
      content: limitText(email, REQUEST_LIMITS.aiTextChars),
    });
  }

  const uploadedFiles = [
    ...formData.getAll("files"),
    ...formData.getAll("photos"),
  ].filter(isFile);

  if (uploadedFiles.length > REQUEST_LIMITS.maxUploadFiles) {
    throw new Error("Troppi file caricati in una singola richiesta");
  }

  for (const value of formData.getAll("files")) {
    if (isFile(value)) {
      sources.push(await fileToSource(value, "file"));
    }
  }

  for (const value of formData.getAll("photos")) {
    if (isFile(value)) {
      sources.push(await fileToSource(value, "photo"));
    }
  }

  return sources;
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "ai-location-extract",
      limit: 12,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const tooLarge = rejectLargeRequest(
      request,
      REQUEST_LIMITS.maxUploadBytes * REQUEST_LIMITS.maxUploadFiles,
    );
    if (tooLarge) return tooLarge;

    const contentType = request.headers.get("content-type") ?? "";
    const sources = contentType.includes("multipart/form-data")
      ? await parseFormSources(request)
      : await parseJsonSources(request);
    const result = await extractAndSaveSmartLocation(sources);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to extract smart location details",
      },
      { status: 400 },
    );
  }
}
