import Link from "next/link";

const navLinks = [
  { href: "#funzionalita", label: "Funzionalità" },
  { href: "#come-funziona", label: "Come funziona" },
];

export function Header() {
  return (
    <header className="border-b border-primary-black/10 bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-white"
            aria-hidden
          >
            V
          </span>
          <span className="text-lg font-semibold text-primary-black">
            VibeUp
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-primary-black/70 transition-colors hover:text-primary-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="#inizia"
          className="rounded-full bg-brand-pink px-5 py-2 text-sm font-medium text-primary-black transition-colors hover:bg-brand-pink/90"
        >
          Inizia gratis
        </Link>
      </div>
    </header>
  );
}
