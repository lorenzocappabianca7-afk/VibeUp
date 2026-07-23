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
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

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
/** Keep in sync with CSS transition below. */
const EXPAND_MS = 420;
const EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<number | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const openRef = useRef(false);

  useBodyScrollLock(scrollLocked);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current != null) window.clearTimeout(focusTimerRef.current);
      if (lockTimerRef.current != null) window.clearTimeout(lockTimerRef.current);
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

  function clearSideTimers() {
    if (focusTimerRef.current != null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    if (lockTimerRef.current != null) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }

  function closeSearch(options?: { keepDraft?: boolean }) {
    clearSideTimers();
    openRef.current = false;
    setScrollLocked(false);
    setOpen(false);
    if (!options?.keepDraft) setDraft(query);
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
    if (openRef.current) return;
    clearSideTimers();
    setDraft(query);
    openRef.current = true;
    // Single state flip — CSS grid-rows does the continuous expand (no JS height tween).
    setOpen(true);

    // Defer side-effects until after the expand finishes so nothing hits mid-tween.
    lockTimerRef.current = window.setTimeout(() => {
      lockTimerRef.current = null;
      if (openRef.current) setScrollLocked(true);
    }, EXPAND_MS);

    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null;
      if (openRef.current) inputRef.current?.focus();
    }, EXPAND_MS);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  }

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
        style={{ transition: `opacity ${EXPAND_MS}ms ${EASE}` }}
        data-overlay-open={open ? "true" : undefined}
        onClick={() => closeSearch()}
      />

      <div
        className={cn("relative flex min-w-0 items-start gap-2", open ? "z-[50]" : "z-[45]")}
      >
        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden border bg-white",
            open
              ? "rounded-[28px] border-primary-black/8 shadow-[0_16px_40px_rgba(15,15,17,0.16)]"
              : "rounded-full border-primary-black/10 shadow-[0_2px_12px_rgba(15,15,17,0.08)]",
          )}
          style={{
            transition: [
              `border-radius ${EXPAND_MS}ms ${EASE}`,
              `box-shadow ${EXPAND_MS}ms ${EASE}`,
              `border-color ${EXPAND_MS}ms ${EASE}`,
            ].join(", "),
          }}
        >
          {/* Fixed header slot — crossfade only, no layout swap */}
          <div className="relative h-[58px]">
            <button
              type="button"
              onClick={openSearch}
              tabIndex={open ? -1 : 0}
              aria-hidden={open}
              className={cn(
                "absolute inset-0 flex w-full min-w-0 items-center gap-3 px-4 text-left",
                open && "pointer-events-none",
              )}
              style={{
                opacity: open ? 0 : 1,
                transition: `opacity ${EXPAND_MS * 0.5}ms ${EASE}`,
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

            <form
              onSubmit={handleSubmit}
              aria-hidden={!open}
              className={cn(
                "absolute inset-0 flex items-center px-3",
                !open && "pointer-events-none",
              )}
              style={{
                opacity: open ? 1 : 0,
                transition: `opacity ${EXPAND_MS * 0.5}ms ${EASE}`,
              }}
            >
              <div className="flex w-full items-center gap-2 rounded-2xl bg-primary-black/[0.03] px-3 py-2.5">
                <Search
                  className="h-4 w-4 shrink-0 text-primary-black/45"
                  aria-hidden
                />
                <input
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
                      setDraft("");
                      onQueryChange("");
                      inputRef.current?.focus();
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

          {/*
            Pure CSS expand: grid 0fr → 1fr is interpolated as one continuous
            motion. Avoids JS height / WAAPI (those force layout each frame and hitch).
          */}
          <div
            className="grid"
            style={{
              gridTemplateRows: open ? "1fr" : "0fr",
              transition: `grid-template-rows ${EXPAND_MS}ms ${EASE}`,
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className="border-t border-primary-black/8"
                style={{
                  opacity: open ? 1 : 0,
                  transition: `opacity ${EXPAND_MS * 0.75}ms ${EASE}`,
                }}
              >
                <div className="max-h-[min(58dvh,420px)] overflow-y-auto overscroll-contain px-2 py-2">
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
                      setDraft("");
                      onQueryChange("");
                      inputRef.current?.focus();
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
        </div>

        {/* Filters: leave layout only at open start (not mid-tween) via absolute */}
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={`Filtri${activeFilterCount > 0 ? `, ${activeFilterCount} attivi` : ""}`}
          tabIndex={open ? -1 : 0}
          aria-hidden={open}
          className={cn(
            "flex h-[58px] w-[52px] shrink-0 items-center justify-center rounded-full border",
            open
              ? "pointer-events-none absolute right-0 top-0 border-transparent opacity-0"
              : cn(
                  "relative opacity-100",
                  activeFilterCount > 0
                    ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
                    : "border-primary-black/10 bg-white text-primary-black shadow-[0_2px_12px_rgba(15,15,17,0.08)]",
                ),
          )}
          style={{
            transition: `opacity ${EXPAND_MS * 0.4}ms ${EASE}`,
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
