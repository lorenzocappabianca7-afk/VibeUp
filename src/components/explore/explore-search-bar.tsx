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
  const [draft, setDraft] = useState(query);
  const [recent, setRecent] = useState(() => readRecent(storageKey));
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(expanded);

  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    function onKeyDown(event: Event) {
      if ((event as globalThis.KeyboardEvent).key === "Escape") {
        setExpanded(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

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

  function commitSearch(term: string) {
    const cleaned = term.trim();
    onQueryChange(cleaned);
    if (cleaned) persistRecent(cleaned);
    setDraft(cleaned);
    setExpanded(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    commitSearch(draft);
  }

  function openSearch() {
    setDraft(query);
    setExpanded(true);
  }

  function closeSearch() {
    setExpanded(false);
    setDraft(query);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  }

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="Chiudi ricerca"
          className="fixed inset-0 z-[40] bg-primary-black/25"
          data-overlay-open="true"
          onClick={closeSearch}
        />
      )}

      <div className={cn("relative z-[45]", expanded && "z-[50]")}>
        {!expanded ? (
          <div className="flex min-w-0 gap-2">
            <button
              type="button"
              onClick={openSearch}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-primary-black/10 bg-white px-4 py-3 text-left shadow-[0_2px_12px_rgba(15,15,17,0.08)] transition-shadow hover:shadow-[0_4px_18px_rgba(15,15,17,0.12)]"
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

            <button
              type="button"
              onClick={onOpenFilters}
              aria-label={`Filtri${activeFilterCount > 0 ? `, ${activeFilterCount} attivi` : ""}`}
              className={cn(
                "relative flex shrink-0 items-center justify-center rounded-full border px-3.5 transition-colors duration-150",
                activeFilterCount > 0
                  ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
                  : "border-primary-black/10 bg-white text-primary-black shadow-[0_2px_12px_rgba(15,15,17,0.08)] hover:bg-primary-black/[0.03]",
              )}
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-primary-black/8 bg-white shadow-[0_16px_40px_rgba(15,15,17,0.18)]">
            <form
              onSubmit={handleSubmit}
              className="border-b border-primary-black/8 p-3"
            >
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
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-black/10 text-primary-black/55"
                    aria-label="Cancella testo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-primary-black/50"
                  >
                    Chiudi
                  </button>
                )}
              </div>
            </form>

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
    </>
  );
}
