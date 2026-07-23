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
const EXPAND_MS = 400;

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
  const [expanded, setExpanded] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [draft, setDraft] = useState(query);
  const [recent, setRecent] = useState(() => readRecent(storageKey));
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);

  useBodyScrollLock(panelMounted);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (openFrameRef.current != null) {
        window.cancelAnimationFrame(openFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(
      () => inputRef.current?.focus(),
      EXPAND_MS * 0.35,
    );
    return () => window.clearTimeout(timer);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    function onKeyDown(event: Event) {
      if ((event as globalThis.KeyboardEvent).key === "Escape") {
        setExpanded(false);
        setDraft(query);
        if (closeTimerRef.current != null) {
          window.clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
          closeTimerRef.current = null;
          setPanelMounted(false);
        }, EXPAND_MS);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, query]);

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

  function clearPendingTimers() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openFrameRef.current != null) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }
  }

  function closeSearch(options?: { keepDraft?: boolean }) {
    clearPendingTimers();
    setExpanded(false);
    if (!options?.keepDraft) setDraft(query);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setPanelMounted(false);
    }, EXPAND_MS);
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
    clearPendingTimers();
    setDraft(query);
    setPanelMounted(true);
    // Paint the panel at 0fr first, then expand so growth is visible.
    openFrameRef.current = window.requestAnimationFrame(() => {
      openFrameRef.current = window.requestAnimationFrame(() => {
        openFrameRef.current = null;
        setExpanded(true);
      });
    });
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
        tabIndex={expanded ? 0 : -1}
        aria-hidden={!expanded}
        className={cn(
          "fixed inset-0 z-[40] bg-primary-black/25 transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          expanded
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        data-overlay-open={expanded ? "true" : undefined}
        onClick={() => closeSearch()}
      />

      <div
        className={cn(
          "relative flex min-w-0 gap-2",
          panelMounted ? "z-[50]" : "z-[45]",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden border bg-white transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            expanded
              ? "rounded-[28px] border-primary-black/8 shadow-[0_16px_40px_rgba(15,15,17,0.18)]"
              : "rounded-full border-primary-black/10 shadow-[0_2px_12px_rgba(15,15,17,0.08)] hover:shadow-[0_4px_18px_rgba(15,15,17,0.12)]",
          )}
        >
          {!panelMounted ? (
            <button
              type="button"
              onClick={openSearch}
              className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left"
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
          ) : (
            <form onSubmit={handleSubmit} className="p-3">
              <div className="flex items-center gap-2 rounded-2xl bg-primary-black/[0.03] px-3 py-2.5">
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
                  // 16px prevents iOS Safari from zooming into the field
                  className="min-w-0 flex-1 bg-transparent text-base font-medium text-primary-black outline-none placeholder:font-normal placeholder:text-primary-black/40"
                />
                {draft ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft("");
                      onQueryChange("");
                      inputRef.current?.focus();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/10 text-primary-black/55 transition-colors hover:bg-primary-black/15"
                    aria-label="Cancella testo"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => closeSearch()}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary-black/45 transition-colors hover:bg-primary-black/[0.06] hover:text-primary-black/70"
                    aria-label="Chiudi ricerca"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </form>
          )}

          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              {panelMounted && (
                <div
                  className={cn(
                    "border-t border-primary-black/8 transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
                    expanded ? "opacity-100" : "opacity-0",
                  )}
                >
                  <div className="max-h-[min(58dvh,420px)] overflow-y-auto px-2 py-2">
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
                                  className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-black/35 transition-colors hover:bg-primary-black/[0.06] hover:text-primary-black/55"
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
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-primary-black/[0.03]"
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
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={`Filtri${activeFilterCount > 0 ? `, ${activeFilterCount} attivi` : ""}`}
          tabIndex={expanded ? -1 : 0}
          aria-hidden={expanded}
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-full border px-3.5 transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            expanded
              ? "pointer-events-none w-0 scale-90 border-transparent px-0 opacity-0"
              : "opacity-100",
            !expanded &&
              (activeFilterCount > 0
                ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
                : "border-primary-black/10 bg-white text-primary-black shadow-[0_2px_12px_rgba(15,15,17,0.08)] hover:bg-primary-black/[0.03]"),
          )}
        >
          <SlidersHorizontal className="h-5 w-5 shrink-0" aria-hidden />
          {activeFilterCount > 0 && !expanded && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
