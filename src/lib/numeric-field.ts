/** Collapse the caret so iOS does not paint text-selection handles. */
export function collapseCaret(node: HTMLInputElement) {
  const end = node.value.length;
  try {
    node.setSelectionRange(end, end);
  } catch {
    // Some native types reject setSelectionRange.
  }
}

export function scheduleCollapseCaret(node: HTMLInputElement) {
  collapseCaret(node);
  requestAnimationFrame(() => collapseCaret(node));
  window.setTimeout(() => collapseCaret(node), 50);
}

/** Shared props for dedicated numeric fields (no iOS text accessory / selection). */
export const NUMERIC_FIELD_INPUT_PROPS = {
  type: "text" as const,
  inputMode: "tel" as const,
  pattern: "[0-9]*",
  autoComplete: "off",
  autoCorrect: "off" as const,
  autoCapitalize: "off" as const,
  spellCheck: false,
};
