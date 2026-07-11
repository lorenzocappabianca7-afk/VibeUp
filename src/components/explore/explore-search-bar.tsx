"use client";

import { cn } from "@/lib/utils";
import { SlidersHorizontal, Search } from "lucide-react";

interface ExploreSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  placeholder?: string;
}

export function ExploreSearchBar({
  query,
  onQueryChange,
  activeFilterCount,
  onOpenFilters,
  placeholder = "Cerca location...",
}: ExploreSearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-black/40"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-primary-black/10 bg-primary-black/[0.03] py-3 pl-10 pr-4 text-sm text-primary-black transition-colors duration-150 placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
        />
      </div>

      <button
        type="button"
        onClick={onOpenFilters}
        className={cn(
          "relative flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3.5 text-[15px] font-bold transition-colors duration-150",
          activeFilterCount > 0
            ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
            : "border-primary-black/10 bg-background text-primary-black hover:bg-primary-black/[0.03]",
        )}
      >
        <SlidersHorizontal className="h-5 w-5" aria-hidden />
        Filtri
        {activeFilterCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}
