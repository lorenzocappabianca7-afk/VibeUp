import { cn } from "@/lib/utils";
import Link from "next/link";

const LINKS = [
  { href: "/admin/catalog", id: "catalog", label: "Catalogo" },
  { href: "/admin/demo", id: "demo", label: "Demo" },
  { href: "/admin/iscrizioni", id: "signups", label: "Iscrizioni" },
] as const;

export function AdminSectionLinks({ current }: { current: (typeof LINKS)[number]["id"] }) {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold" aria-label="Aree admin">
      {LINKS.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={cn(
            "underline-offset-4 hover:underline",
            link.id === current ? "text-primary-black" : "text-primary-black/45",
          )}
          aria-current={link.id === current ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
