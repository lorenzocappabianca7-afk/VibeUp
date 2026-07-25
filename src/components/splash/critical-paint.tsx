import { CRITICAL_PAINT_ID } from "@/lib/critical-paint";

/**
 * Server-only black full-screen shell in the first HTML body bytes.
 * CSS for this lives in <head> (CRITICAL_PAINT_CSS) so it applies before paint.
 */
export function CriticalPaint() {
  return <div id={CRITICAL_PAINT_ID} aria-hidden />;
}
