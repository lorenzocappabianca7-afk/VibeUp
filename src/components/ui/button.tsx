import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  /* Solid light CTA on night canvas — Instagram-style */
  primary:
    "bg-paper text-ink-inverse hover:bg-paper-deep focus-visible:ring-offset-background",
  /* Soft brand accent — use sparingly */
  secondary:
    "bg-brand-pink/20 text-brand-pink ring-1 ring-brand-pink/35 hover:bg-brand-pink/28",
  outline:
    "border border-primary-black/20 bg-surface text-primary-black hover:border-primary-black/35 hover:bg-surface-2",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "touch-feedback inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
