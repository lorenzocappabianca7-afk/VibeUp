import type { SmartLocationInputSource } from "@/server/services/smart-location-types";

export interface AiExtractedLocationPayload {
  name?: string;
  city?: string;
  comune?: string;
  address?: string;
  description?: string;
  capacity?: number;
  hourlyPrice?: number;
  surfaceSqm?: number;
  parkingSpots?: number;
  minHours?: number;
  accessibility?: boolean;
  airConditioning?: boolean;
  outdoorArea?: boolean;
  includedServices?: string[];
  partyTypes?: string[];
  services?: Array<{
    type?: string;
    name?: string;
    description?: string;
    price?: number;
    pricingUnit?: string;
    included?: boolean;
    minGuests?: number;
    maxGuests?: number;
  }>;
  confidence?: number;
  rawSummary?: string;
  extractedFields?: string[];
  suggestedReviewFields?: string[];
}

const LOCATION_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    city: { type: "string" },
    comune: { type: "string" },
    address: { type: "string" },
    description: { type: "string" },
    capacity: { type: "number" },
    hourlyPrice: { type: "number" },
    surfaceSqm: { type: "number" },
    parkingSpots: { type: "number" },
    minHours: { type: "number" },
    accessibility: { type: "boolean" },
    airConditioning: { type: "boolean" },
    outdoorArea: { type: "boolean" },
    includedServices: { type: "array", items: { type: "string" } },
    partyTypes: { type: "array", items: { type: "string" } },
    services: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          pricingUnit: { type: "string" },
          included: { type: "boolean" },
          minGuests: { type: "number" },
          maxGuests: { type: "number" },
        },
      },
    },
    confidence: { type: "number" },
    rawSummary: { type: "string" },
    extractedFields: { type: "array", items: { type: "string" } },
    suggestedReviewFields: { type: "array", items: { type: "string" } },
  },
};

function sourceToPrompt(source: SmartLocationInputSource): string {
  const label = [
    `Tipo: ${source.kind}`,
    source.fileName ? `Nome file: ${source.fileName}` : null,
    source.mimeType ? `MIME: ${source.mimeType}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return `${label}\n${source.content ?? ""}`.trim();
}

function extractOutputText(responseBody: unknown): string | null {
  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "output_text" in responseBody &&
    typeof responseBody.output_text === "string"
  ) {
    return responseBody.output_text;
  }

  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "output" in responseBody &&
    Array.isArray(responseBody.output)
  ) {
    const chunks = responseBody.output.flatMap((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "content" in item &&
        Array.isArray(item.content)
      ) {
        return (item.content as unknown[])
          .map((contentItem: unknown) => {
            if (
              typeof contentItem === "object" &&
              contentItem !== null &&
              "text" in contentItem &&
              typeof contentItem.text === "string"
            ) {
              return contentItem.text;
            }
            return null;
          })
          .filter(Boolean);
      }
      return [];
    });

    return chunks.length > 0 ? chunks.join("\n") : null;
  }

  return null;
}

export async function extractLocationWithVisionModel(
  sources: SmartLocationInputSource[],
): Promise<AiExtractedLocationPayload | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const content = [
    {
      type: "input_text",
      text: [
        "Estrai dettagli strutturati di una location per feste in Piemonte.",
        "Usa foto, listini, email e testi per ricavare dati del locale, servizi interni, menu e prezzi.",
        "Normalizza i prezzi in euro. Se un dato non e' presente, omettilo e aggiungilo a suggestedReviewFields.",
        "Rispondi solo con JSON valido conforme allo schema.",
        "",
        sources.map(sourceToPrompt).join("\n\n---\n\n"),
      ].join("\n"),
    },
    ...sources
      .filter((source) => source.dataUrl)
      .map((source) => ({
        type: "input_image",
        image_url: source.dataUrl,
      })),
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_LOCATION_MODEL ?? "gpt-4.1-mini",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "vibeup_location_extraction",
          schema: LOCATION_EXTRACTION_SCHEMA,
          strict: false,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM extraction failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  const outputText = extractOutputText(body);
  if (!outputText) return null;

  return JSON.parse(outputText) as AiExtractedLocationPayload;
}
