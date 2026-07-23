"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/utils";
import {
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { flushSync } from "react-dom";

export interface ExploreSearchSuggestion {
  id: string;
  label: string;
  subtitle?: string;
}

interface ExploreSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  placeholder?: string;
  suggestions?: ExploreSearchSuggestion[];
  storageKey?: string;
}

const MAX_RECENT = 8;
const HEADER_PX = 58;
const FILTER_PX = 52;
const CLEAR_PX = 36;

/** iOS-like spring — continuous velocity, no mid-curve stall. */
const SPRING_STIFFNESS = 210;
const SPRING_DAMPING = 26;
const SPRING_MASS = 1;
const SPRING_REST_VELOCITY = 0.35;
const SPRING_REST_DISTANCE = 0.35;

function readRecent(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(storageKey: string, values: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(values.slice(0, MAX_RECENT)),
    );
  } catch {
    // private mode / quota
  }
}

export function ExploreSearchBar({
  query,
  onQueryChange,
  activeFilterCount,
  onOpenFilters,
  placeholder = "Cerca location...",
  suggestions = [],
  storageKey = "vibeup-explore-recent-searches-v1",
}: ExploreSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [draft, setDraft] = useState(query);
  const [recent, setRecent] = useState(() => readRecent(storageKey));
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const openRef = useRef(false);
  const animatingRef = useRef(false);
  const pendingOpenAnimRef = useRef(false);
  const fullHeightRef = useRef(HEADER_PX);
  const clipRef = useRef(0);

  useBodyScrollLock(scrollLocked);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.height = `${HEADER_PX}px`;
    panel.style.borderRadius = "9999px";
    panel.style.boxShadow = "0 2px 12px rgba(15,15,17,0.08)";
    panel.style.clipPath = "none";
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current != null) {
        window.cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: Event) {
      if ((event as globalThis.KeyboardEvent).key === "Escape") {
        closeSearch();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- escape while open
  }, [open, query]);

  const filteredSuggestions = useMemo(() => {
    const normalized = draft.trim().toLowerCase();
    if (!normalized) return suggestions.slice(0, 6);
    return suggestions
      .filter(
        (item) =>
          item.label.toLowerCase().includes(normalized) ||
          item.subtitle?.toLowerCase().includes(normalized),
      )
      .slice(0, 6);
  }, [draft, suggestions]);

  const visibleRecent = useMemo(() => {
    const normalized = draft.trim().toLowerCase();
    if (!normalized) return recent;
    return recent.filter((item) => item.toLowerCase().includes(normalized));
  }, [draft, recent]);

  function persistRecent(term: string) {
    const cleaned = term.trim();
    if (!cleaned) return;
    setRecent((current) => {
      const next = [
        cleaned,
        ...current.filter(
          (item) => item.toLowerCase() !== cleaned.toLowerCase(),
        ),
      ].slice(0, MAX_RECENT);
      writeRecent(storageKey, next);
      return next;
    });
  }

  function removeRecent(term: string) {
    setRecent((current) => {
      const next = current.filter((item) => item !== term);
      writeRecent(storageKey, next);
      return next;
    });
  }

  function stopSpring() {
    if (animFrameRef.current != null) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    animatingRef.current = false;
  }

  function setClipBottom(px: number) {
    const panel = panelRef.current;
    if (!panel) return;
    clipRef.current = px;
    if (px <= 0.5) {
      panel.style.clipPath = "none";
      return;
    }
    panel.style.clipPath = `inset(0px 0px ${px}px 0px)`;
  }

  /**
   * Spring-driven clip reveal. Height is set once; only clip-path changes
   * each frame (compositor-friendly) → continuous fluid motion.
   */
  function springClip(from: number, to: number, onDone?: () => void) {
    const panel = panelRef.current;
    if (!panel) {
      onDone?.();
      return;
    }

    stopSpring();
    animatingRef.current = true;
    panel.style.willChange = "clip-path";
    setClipBottom(from);

    let position = from;
    let velocity = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const displacement = position - to;
      const accel =
        (-SPRING_STIFFNESS * displacement - SPRING_DAMPING * velocity) /
        SPRING_MASS;
      velocity += accel * dt;
      position += velocity * dt;

      setClipBottom(Math.max(0, position));

      const settled =
        Math.abs(velocity) < SPRING_REST_VELOCITY &&
        Math.abs(position - to) < SPRING_REST_DISTANCE;

      if (!settled) {
        animFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      setClipBottom(to);
      animFrameRef.current = null;
      animatingRef.current = false;
      panel.style.willChange = "auto";
      onDone?.();
    };

    animFrameRef.current = window.requestAnimationFrame(tick);
  }

  function closeSearch(options?: { keepDraft?: boolean }) {
    if (!openRef.current && !open) return;
    openRef.current = false;
    setScrollLocked(false);
    pendingOpenAnimRef.current = false;

    const panel = panelRef.current;
    const full = fullHeightRef.current;
    const hidden = Math.max(0, full - HEADER_PX);

    if (panel) {
      panel.style.height = `${full}px`;
      panel.style.borderRadius = "9999px";
      panel.style.boxShadow = "0 2px 12px rgba(15,15,17,0.08)";
    }

    springClip(clipRef.current || 0, hidden, () => {
      if (panel) {
        panel.style.height = `${HEADER_PX}px`;
        panel.style.clipPath = "none";
      }
      clipRef.current = 0;
      inputRef.current?.blur();
      setOpen(false);
      if (!options?.keepDraft) setDraft(query);
    });
  }

  function commitSearch(term: string) {
    const cleaned = term.trim();
    onQueryChange(cleaned);
    if (cleaned) persistRecent(cleaned);
    setDraft(cleaned);
    closeSearch({ keepDraft: true });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    commitSearch(draft);
  }

  function openSearch() {
    if (openRef.current || animatingRef.current) return;
    setDraft(query);
    openRef.current = true;
    pendingOpenAnimRef.current = true;
    // Flush + focus in the same tap so mobile keyboards open immediately.
    flushSync(() => {
      setOpen(true);
    });
    const input = inputRef.current;
    if (input && document.activeElement !== input) {
      input.focus({ preventScroll: true });
    }
  }

  // Run the spring after React commits open chrome + measurable body.
  useLayoutEffect(() => {
    if (!open || !pendingOpenAnimRef.current) return;
    pendingOpenAnimRef.current = false;

    const panel = panelRef.current;
    const body = bodyRef.current;
    if (!panel || !body) return;

    const full = HEADER_PX + body.scrollHeight;
    fullHeightRef.current = full;
    const hidden = Math.max(0, full - HEADER_PX);

    panel.style.height = `${full}px`;
    panel.style.borderRadius = "28px";
    panel.style.boxShadow = "0 16px 40px rgba(15,15,17,0.16)";
    panel.style.overflow = "hidden";

    springClip(hidden, 0, () => {
      if (!openRef.current) return;
      setScrollLocked(true);
      // Re-focus in case the spring or scroll lock stole it.
      inputRef.current?.focus({ preventScroll: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open trigger only
  }, [open]);

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  }

  function clearCurrentSearch() {
    setDraft("");
    onQueryChange("");
  }

  const hasQuery = query.trim().length > 0;
  const closedBannerPadRight = open
    ? 16
    : hasQuery
      ? FILTER_PX + CLEAR_PX + 8
      : FILTER_PX + 16;

  return (
    <>
      <button
        type="button"
        aria-label="Chiudi ricerca"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-[40] bg-primary-black/20",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        style={{
          transition: "opacity 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        data-overlay-open={open ? "true" : undefined}
        onClick={() => closeSearch()}
      />

      <div
        className={cn("relative", open ? "z-[50]" : "z-[45]")}
        style={{ height: HEADER_PX }}
      >
        <div
          ref={panelRef}
          className="absolute inset-x-0 top-0 overflow-hidden border border-primary-black/10 bg-white"
          style={{
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        >
          <div className="relative" style={{ height: HEADER_PX }}>
            <button
              type="button"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                openSearch();
              }}
              onClick={openSearch}
              tabIndex={open ? -1 : 0}
              aria-hidden={open}
              className={cn(
                "absolute inset-0 flex w-full min-w-0 items-center gap-3 px-4 text-left",
                open && "pointer-events-none",
              )}
              style={{
                paddingRight: closedBannerPadRight,
                opacity: open ? 0 : 1,
              }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-black/[0.04] text-primary-black">
                <Search className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-primary-black">
                  {query.trim() || placeholder}
                </span>
                <span className="mt-0.5 block truncate text-xs text-primary-black/45">
                  {query.trim()
                    ? "Tocca per modificare la ricerca"
                    : "Dove vuoi organizzare?"}
                </span>
              </span>
            </button>

            {hasQuery && !open && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearCurrentSearch();
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                className="absolute top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary-black/10 text-primary-black/55"
                style={{ right: FILTER_PX + 2 }}
                aria-label="Cancella ricerca"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}

            <form
              onSubmit={handleSubmit}
              aria-hidden={!open}
              className={cn(
                "absolute inset-0 flex items-center px-3",
                !open && "pointer-events-none",
              )}
              style={{ opacity: open ? 1 : 0 }}
            >
              <div className="flex w-full items-center gap-2 rounded-2xl bg-primary-black/[0.03] px-3 py-2.5">
                <Search
                  className="h-4 w-4 shrink-0 text-primary-black/45"
                  aria-hidden
                />
                <input
                  id={inputId}
                  ref={inputRef}
                  type="search"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    onQueryChange(event.target.value);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder={placeholder}
                  autoComplete="off"
                  enterKeyHint="search"
                  tabIndex={open ? 0 : -1}
                  className="min-w-0 flex-1 bg-transparent text-base font-medium text-primary-black outline-none placeholder:font-normal placeholder:text-primary-black/40"
                />
                {draft ? (
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => {
                      clearCurrentSearch();
                      inputRef.current?.focus({ preventScroll: true });
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/10 text-primary-black/55"
                    aria-label="Cancella testo"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => closeSearch()}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary-black/45"
                    aria-label="Chiudi ricerca"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </form>
          </div>

          <div
            ref={bodyRef}
            aria-hidden={!open}
            style={{ pointerEvents: open ? "auto" : "none" }}
          >
            <div className="border-t border-primary-black/8">
              <div className="max-h-[min(52dvh,400px)] overflow-y-auto overscroll-contain px-2 py-2 [-webkit-overflow-scrolling:touch]">
                {visibleRecent.length > 0 && (
                  <section className="mb-2">
                    <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-black/40">
                      Ricerche recenti
                    </p>
                    <ul>
                      {visibleRecent.map((term) => (
                        <li key={term}>
                          <div className="flex items-center gap-1 rounded-2xl hover:bg-primary-black/[0.03]">
                            <button
                              type="button"
                              onClick={() => commitSearch(term)}
                              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-black/[0.05] text-primary-black/55">
                                <Clock3 className="h-4 w-4" aria-hidden />
                              </span>
                              <span className="truncate text-[15px] font-medium text-primary-black">
                                {term}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRecent(term)}
                              className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-black/35"
                              aria-label={`Elimina ricerca ${term}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section>
                  <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-black/40">
                    Suggeriti per te
                  </p>
                  {filteredSuggestions.length > 0 ? (
                    <ul>
                      {filteredSuggestions.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => commitSearch(item.label)}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-primary-black/[0.03]"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-black/[0.05] text-primary-black/55">
                              <MapPin className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-semibold text-primary-black">
                                {item.label}
                              </span>
                              {item.subtitle && (
                                <span className="mt-0.5 block truncate text-xs text-primary-black/45">
                                  {item.subtitle}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-4 text-sm text-primary-black/45">
                      Nessun suggerimento per questa ricerca.
                    </p>
                  )}
                </section>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-primary-black/8 px-3 py-3">
                <button
                  type="button"
                  onClick={() => {
                    clearCurrentSearch();
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                  className="text-sm font-semibold text-primary-black/55 underline-offset-2 hover:underline"
                >
                  Cancella
                </button>
                <button
                  type="button"
                  onClick={() => commitSearch(draft)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-black px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Search className="h-4 w-4" aria-hidden />
                  Cerca
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={`Filtri${activeFilterCount > 0 ? `, ${activeFilterCount} attivi` : ""}`}
          tabIndex={open ? -1 : 0}
          aria-hidden={open}
          className={cn(
            "absolute top-0 flex items-center justify-center rounded-full border",
            open
              ? "pointer-events-none border-transparent opacity-0"
              : activeFilterCount > 0
                ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal opacity-100"
                : "border-primary-black/10 bg-white text-primary-black opacity-100 shadow-[0_2px_12px_rgba(15,15,17,0.08)]",
          )}
          style={{
            right: 0,
            width: FILTER_PX,
            height: HEADER_PX,
          }}
        >
          <SlidersHorizontal className="h-5 w-5 shrink-0" aria-hidden />
          {activeFilterCount > 0 && !open && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
