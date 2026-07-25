import {
  CRITICAL_PAINT_ID,
  CRITICAL_PAINT_INLINE_STYLE,
} from "@/lib/critical-paint";

/**
 * Server-only black full-screen shell with INLINE styles (no CSS file wait).
 * Stays until SplashScreen finishes — never remove early or a white gap appears.
 */
export function CriticalPaint() {
  return (
    <div
      id={CRITICAL_PAINT_ID}
      style={CRITICAL_PAINT_INLINE_STYLE}
      aria-hidden
    />
  );
}
