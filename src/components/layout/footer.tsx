import Image from "next/image";

export function Footer() {
  return (
    <footer className="hidden shrink-0 bg-primary-black text-white lg:block">
      <div className="mx-auto grid max-w-6xl gap-6 px-8 py-8 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/vibeup-mark.png"
              alt="Logo VibeUp"
              width={52}
              height={52}
              className="h-[52px] w-[52px]"
            />
            <p className="text-3xl font-black tracking-tight">VibeUp</p>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-bold text-white">e-mail</span>
            <a
              href="mailto:vibeup.planner@gmail.com"
              className="font-medium text-white/72 transition-colors hover:text-white"
            >
              vibeup.planner@gmail.com
            </a>
          </p>
          <div className="mt-4 min-h-[3rem]" aria-hidden />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white/72">
            Seguici sui social
          </span>
          <a
            href="https://www.instagram.com/vibeup.planner"
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-brand-pink hover:bg-brand-pink hover:text-primary-black"
            aria-label="Instagram VibeUp"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <rect x="4" y="4" width="16" height="16" rx="5" />
              <circle cx="12" cy="12" r="3.5" />
              <circle cx="17" cy="7" r="0.7" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@vibeup.planner"
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-brand-teal hover:bg-brand-teal"
            aria-label="TikTok VibeUp"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M14.8 3h2.2c.3 2.1 1.6 3.8 3.7 4.4v2.4c-1.5-.1-2.8-.6-3.9-1.5v6.8c0 3.5-2.2 5.9-5.6 5.9-3 0-5.2-2-5.2-4.8 0-3 2.3-5 5.4-5 .5 0 .9.1 1.3.2v2.6c-.4-.1-.8-.2-1.2-.2-1.6 0-2.7.9-2.7 2.3 0 1.3 1 2.2 2.4 2.2 1.6 0 2.6-1 2.6-3V3z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
