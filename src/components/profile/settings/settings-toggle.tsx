"use client";

import { cn } from "@/lib/utils";

interface SettingsToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}

export function SettingsToggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "hover:bg-primary-black/[0.03]",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-primary-black">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-snug text-primary-black/50">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-teal" : "bg-primary-black/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
