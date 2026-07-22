"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      {(title || description) && (
        <div className="px-1">
          {title && (
            <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-primary-black/45">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-primary-black/50">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-primary-black/10 bg-background">
        {children}
      </div>
    </section>
  );
}

interface SettingsNavRowProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function SettingsNavRow({
  icon: Icon,
  label,
  description,
  value,
  onClick,
  disabled = false,
  destructive = false,
}: SettingsNavRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-primary-black/8 px-4 py-3.5 text-left last:border-b-0",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "transition-colors hover:bg-primary-black/[0.03]",
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            destructive ? "text-brand-pink" : "text-primary-black/45",
          )}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-medium",
            destructive ? "text-brand-pink" : "text-primary-black",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-snug text-primary-black/50">
            {description}
          </span>
        )}
      </span>
      {value && (
        <span className="max-w-[40%] truncate text-xs font-semibold text-primary-black/45">
          {value}
        </span>
      )}
      {onClick && !disabled && (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-primary-black/30"
          aria-hidden
        />
      )}
    </button>
  );
}

interface SettingsInfoCardProps {
  children: ReactNode;
  tone?: "neutral" | "teal" | "pink";
}

export function SettingsInfoCard({
  children,
  tone = "neutral",
}: SettingsInfoCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-xs leading-relaxed",
        tone === "neutral" && "bg-primary-black/[0.03] text-primary-black/60",
        tone === "teal" && "bg-brand-teal/10 text-brand-teal",
        tone === "pink" && "bg-brand-pink/10 text-brand-pink",
      )}
    >
      {children}
    </div>
  );
}
