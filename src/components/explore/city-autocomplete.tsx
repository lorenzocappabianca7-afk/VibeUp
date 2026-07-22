"use client";

import { PIEMONTE_CITY_SUGGESTIONS } from "@/lib/mock/mockData";
import { cn } from "@/lib/utils";
import { MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface CityAutocompleteProps {
  value: string | null;
  onChange: (comune: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  disabled,
  className,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputValue = open ? query : value ?? query;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const normalized = inputValue.trim().toLowerCase();
    if (!normalized) return PIEMONTE_CITY_SUGGESTIONS;

    return PIEMONTE_CITY_SUGGESTIONS.filter((city) =>
      city.toLowerCase().includes(normalized),
    );
  }, [inputValue]);

  function selectCity(city: string) {
    onChange(city);
    setQuery(city);
    setOpen(false);
  }

  function clearSelection() {
    onChange(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-black/40"
          aria-hidden
        />
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange(null);
          }}
          onFocus={() => {
            setQuery(value ?? query);
            setOpen(true);
          }}
          placeholder="Cerca un comune del Piemonte..."
          className={cn(
            "w-full rounded-2xl border border-primary-black/10 bg-background py-3 pl-10 pr-10 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
        {value && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50"
            aria-label="Cancella città selezionata"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && !disabled && suggestions.length > 0 && (
        <ul className="relative z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-2xl border border-primary-black/10 bg-background py-1 shadow-lg">
          {suggestions.map((city) => (
            <li key={city}>
              <button
                type="button"
                onClick={() => selectCity(city)}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-brand-teal/8",
                  value === city && "bg-brand-teal/10 font-medium text-brand-teal",
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-black/40" />
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !disabled && inputValue.trim() && suggestions.length === 0 && (
        <p className="absolute z-20 mt-2 w-full rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black/50 shadow-lg">
          Nessun comune trovato nel Piemonte
        </p>
      )}
    </div>
  );
}
