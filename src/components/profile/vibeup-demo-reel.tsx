"use client";

import { cn } from "@/lib/utils";
import {
  Check,
  GitCompareArrows,
  Heart,
  MapPin,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const DURATION_MS = 40_000;

type SceneId =
  | "intro"
  | "explore"
  | "quote"
  | "compare"
  | "event"
  | "pay"
  | "outro";

interface Scene {
  id: SceneId;
  start: number;
  end: number;
  caption?: string;
}

const SCENES: Scene[] = [
  { id: "intro", start: 0, end: 5 },
  { id: "explore", start: 5, end: 11, caption: "Trova il locale" },
  { id: "quote", start: 11, end: 18, caption: "Preventivo in un attimo" },
  { id: "compare", start: 18, end: 24, caption: "Compara e scegli" },
  { id: "event", start: 24, end: 31, caption: "Tutto in un evento" },
  { id: "pay", start: 31, end: 36, caption: "Caparra sicura" },
  { id: "outro", start: 36, end: 40 },
];

function sceneProgress(timeSec: number, scene: Scene) {
  const span = scene.end - scene.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (timeSec - scene.start) / span));
}

function isActive(timeSec: number, scene: Scene) {
  return timeSec >= scene.start && timeSec < scene.end;
}

export function VibeUpDemoReel() {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [timeMs, setTimeMs] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeMsRef = useRef(0);

  const stopClock = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  useEffect(() => {
    if (!playing) {
      stopClock();
      return;
    }

    const step = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;

      const next = timeMsRef.current + delta;
      if (next >= DURATION_MS) {
        timeMsRef.current = DURATION_MS;
        setTimeMs(DURATION_MS);
        setPlaying(false);
        stopClock();
        return;
      }

      timeMsRef.current = next;
      setTimeMs(next);
      frameRef.current = requestAnimationFrame(step);
    };

    lastTsRef.current = null;
    frameRef.current = requestAnimationFrame(step);
    return () => stopClock();
  }, [playing, stopClock]);

  const playSoftChime = useCallback(() => {
    if (muted) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current ?? new AudioCtx();
      audioCtxRef.current = ctx;
      void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 523.25;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Audio optional — ignore failures on restricted devices.
    }
  }, [muted]);

  const togglePlay = useCallback(() => {
    setHasStarted(true);
    setPlaying((current) => {
      if (current) return false;
      if (timeMsRef.current >= DURATION_MS) {
        timeMsRef.current = 0;
        setTimeMs(0);
      }
      playSoftChime();
      return true;
    });
  }, [playSoftChime]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          setPlaying(false);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const timeSec = timeMs / 1000;
  const progress = timeMs / DURATION_MS;
  const activeScene = SCENES.find((scene) => isActive(timeSec, scene)) ?? SCENES[0];

  function seek(ratio: number) {
    const next = Math.min(DURATION_MS, Math.max(0, ratio * DURATION_MS));
    timeMsRef.current = next;
    setTimeMs(next);
    setHasStarted(true);
  }

  return (
    <section ref={rootRef} className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary-black/45">
            Guida rapida
          </p>
          <h2 className="mt-1 text-sm font-bold text-primary-black">
            Come funziona VibeUp
          </h2>
        </div>
        <p className="text-[11px] font-semibold text-primary-black/40">40 sec</p>
      </div>

      <div className="mx-auto w-full max-w-[320px]">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-primary-black/10 bg-primary-black shadow-[0_18px_50px_rgba(15,15,17,0.18)]">
          <div className="relative aspect-[9/16] w-full overflow-hidden bg-[#0F0F11]">
            {SCENES.map((scene) => (
              <SceneLayer
                key={scene.id}
                active={isActive(timeSec, scene)}
                progress={sceneProgress(timeSec, scene)}
                scene={scene}
              />
            ))}

            {!hasStarted && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-primary-black/35 px-6 text-center backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary-black shadow-lg transition-transform hover:scale-105"
                  aria-label="Riproduci la guida"
                >
                  <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
                </button>
                <p className="mt-4 text-sm font-semibold text-white/90">
                  Tocca per vedere come si organizza una festa
                </p>
              </div>
            )}

            {hasStarted && activeScene?.caption && (
              <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center px-4">
                <span className="rounded-full bg-primary-black/55 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white backdrop-blur-md">
                  {activeScene.caption}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-white/10 bg-primary-black px-3 py-3">
            <div
              className="group relative h-1.5 cursor-pointer rounded-full bg-white/15"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                seek((event.clientX - rect.left) / rect.width);
              }}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={40}
              aria-valuenow={Math.round(timeSec)}
              aria-label="Avanzamento guida"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") seek(Math.min(1, progress + 0.05));
                if (event.key === "ArrowLeft") seek(Math.max(0, progress - 0.05));
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-teal"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label={playing ? "Pausa" : "Play"}
              >
                {playing ? (
                  <Pause className="h-4 w-4 fill-current" aria-hidden />
                ) : (
                  <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
                )}
              </button>

              <p className="text-[11px] font-semibold tabular-nums text-white/55">
                {formatClock(timeSec)} / 0:40
              </p>

              <button
                type="button"
                onClick={() => setMuted((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label={muted ? "Attiva suono" : "Disattiva suono"}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" aria-hidden />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatClock(seconds: number) {
  const whole = Math.min(40, Math.max(0, Math.floor(seconds)));
  const mm = Math.floor(whole / 60);
  const ss = whole % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function SceneLayer({
  scene,
  active,
  progress,
}: {
  scene: Scene;
  active: boolean;
  progress: number;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-500",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!active}
    >
      {scene.id === "intro" && <IntroScene progress={progress} />}
      {scene.id === "explore" && <ExploreScene progress={progress} />}
      {scene.id === "quote" && <QuoteScene progress={progress} />}
      {scene.id === "compare" && <CompareScene progress={progress} />}
      {scene.id === "event" && <EventScene progress={progress} />}
      {scene.id === "pay" && <PayScene progress={progress} />}
      {scene.id === "outro" && <OutroScene progress={progress} />}
    </div>
  );
}

function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-4 top-8 bottom-8 overflow-hidden rounded-[1.35rem] border border-white/15 bg-background shadow-2xl">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-[10px] font-black tracking-[0.14em] text-primary-black/35">
          VIBEUP
        </span>
        <span className="h-1.5 w-12 rounded-full bg-primary-black/10" />
      </div>
      <div className="h-[calc(100%-2rem)] overflow-hidden px-3 pb-3">{children}</div>
    </div>
  );
}

function IntroScene({ progress }: { progress: number }) {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/demo/party.jpg"
        alt=""
        fill
        className="object-cover"
        style={{ transform: `scale(${1 + progress * 0.08})` }}
        sizes="320px"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-black via-primary-black/45 to-primary-black/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <Image
          src="/vibeup-mark.png"
          alt="VibeUp"
          width={72}
          height={72}
          className="rounded-2xl shadow-lg"
          style={{
            opacity: Math.min(1, progress * 3),
            transform: `translateY(${(1 - Math.min(1, progress * 2)) * 12}px)`,
          }}
        />
        <p
          className="mt-4 text-2xl font-black tracking-tight text-white"
          style={{ opacity: Math.min(1, Math.max(0, (progress - 0.25) * 3)) }}
        >
          VibeUp
        </p>
      </div>
    </div>
  );
}

function ExploreScene({ progress }: { progress: number }) {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/demo/venue.jpg"
        alt=""
        fill
        className="object-cover opacity-40"
        sizes="320px"
      />
      <div className="absolute inset-0 bg-primary-black/55" />
      <PhoneChrome>
        <div className="space-y-2.5">
          <p className="text-xs font-black text-primary-black">Esplora</p>
          {[
            { name: "Loft San Salvario", zone: "Torino", img: "/demo/party.jpg" },
            { name: "Atelier Dora", zone: "Aurora", img: "/demo/venue.jpg" },
            { name: "DJ Luna", zone: "Servizio", img: "/demo/dj.jpg" },
          ].map((card, index) => {
            const appear = Math.min(1, Math.max(0, (progress - index * 0.18) * 3));
            return (
              <div
                key={card.name}
                className="relative overflow-hidden rounded-2xl border border-primary-black/8 bg-white"
                style={{
                  opacity: appear,
                  transform: `translateY(${(1 - appear) * 16}px)`,
                }}
              >
                <div className="relative h-20 w-full">
                  <Image
                    src={card.img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-brand-pink shadow-sm">
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5",
                        progress > 0.55 && index === 0 && "fill-current",
                      )}
                      aria-hidden
                    />
                  </span>
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[11px] font-bold text-primary-black">
                    {card.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-primary-black/45">
                    <MapPin className="h-2.5 w-2.5" aria-hidden />
                    {card.zone}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </PhoneChrome>
    </div>
  );
}

function QuoteScene({ progress }: { progress: number }) {
  const amount = Math.round(180 + progress * 240);
  return (
    <div className="relative h-full w-full">
      <Image
        src="/demo/venue.jpg"
        alt=""
        fill
        className="object-cover"
        style={{ transform: `scale(${1.02 + progress * 0.05})` }}
        sizes="320px"
      />
      <div className="absolute inset-0 bg-primary-black/50" />
      <PhoneChrome>
        <div className="flex h-full flex-col justify-end gap-3 pb-2">
          <div
            className="rounded-2xl border border-brand-teal/25 bg-gradient-to-br from-brand-teal/15 to-white p-3 shadow-sm"
            style={{
              opacity: Math.min(1, progress * 2.2),
              transform: `translateY(${(1 - Math.min(1, progress * 2)) * 20}px)`,
            }}
          >
            <div className="flex items-center gap-2 text-brand-teal">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">
                Preventivo IA
              </span>
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums text-primary-black">
              €{amount}
            </p>
            <p className="mt-1 text-[10px] font-medium text-primary-black/50">
              80 ospiti · 5 ore · setup incluso
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-black/8">
              <div
                className="h-full rounded-full bg-brand-teal"
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </PhoneChrome>
    </div>
  );
}

function CompareScene({ progress }: { progress: number }) {
  return (
    <div className="relative h-full w-full bg-[#F6F7F8]">
      <PhoneChrome>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-brand-teal" aria-hidden />
            <p className="text-xs font-black text-primary-black">Compara</p>
          </div>
          <div
            className="grid grid-cols-2 gap-2"
            style={{
              opacity: Math.min(1, progress * 2),
              transform: `translateX(${(1 - Math.min(1, progress * 2)) * 12}px)`,
            }}
          >
            {[
              { name: "Loft", img: "/demo/party.jpg", price: "Media", ok: true },
              { name: "Atelier", img: "/demo/venue.jpg", price: "Alta", ok: false },
            ].map((col) => (
              <div
                key={col.name}
                className="overflow-hidden rounded-2xl border border-primary-black/8 bg-white"
              >
                <div className="relative h-24">
                  <Image src={col.img} alt="" fill className="object-cover" sizes="140px" />
                </div>
                <div className="space-y-1.5 p-2">
                  <p className="text-[11px] font-bold text-primary-black">{col.name}</p>
                  <p className="text-[10px] font-semibold text-brand-teal">{col.price}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black",
                      col.ok
                        ? "bg-brand-teal/12 text-brand-teal"
                        : "bg-primary-black/5 text-primary-black/35",
                    )}
                  >
                    {col.ok && <Check className="h-2.5 w-2.5" aria-hidden />}
                    {col.ok ? "Audio" : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PhoneChrome>
    </div>
  );
}

function EventScene({ progress }: { progress: number }) {
  const days = Math.max(0, 12 - Math.floor(progress * 4));
  return (
    <div className="relative h-full w-full">
      <Image
        src="/demo/dj.jpg"
        alt=""
        fill
        className="object-cover opacity-35"
        sizes="320px"
      />
      <div className="absolute inset-0 bg-primary-black/60" />
      <PhoneChrome>
        <div className="space-y-3">
          <p className="text-xs font-black text-primary-black">La mia festa</p>
          <div
            className="rounded-2xl bg-primary-black px-3 py-4 text-center text-white"
            style={{ opacity: Math.min(1, progress * 2.5) }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
              Countdown
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums">{days}g</p>
          </div>
          <div className="space-y-2">
            {["Loft San Salvario", "DJ Luna", "Catering"].map((item, index) => {
              const appear = Math.min(1, Math.max(0, (progress - 0.25 - index * 0.15) * 3));
              return (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-xl border border-primary-black/8 bg-white px-2.5 py-2"
                  style={{
                    opacity: appear,
                    transform: `translateX(${(1 - appear) * 14}px)`,
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <p className="text-[11px] font-semibold text-primary-black">{item}</p>
                </div>
              );
            })}
          </div>
        </div>
      </PhoneChrome>
    </div>
  );
}

function PayScene({ progress }: { progress: number }) {
  const paid = progress > 0.45;
  return (
    <div className="relative h-full w-full bg-[#F6F7F8]">
      <PhoneChrome>
        <div className="flex h-full flex-col justify-center gap-4">
          <div
            className="rounded-2xl border border-primary-black/8 bg-white p-4 text-center"
            style={{
              opacity: Math.min(1, progress * 2),
              transform: `scale(${0.94 + Math.min(1, progress) * 0.06})`,
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary-black/40">
              Caparra
            </p>
            <p className="mt-2 text-3xl font-black text-primary-black">€120</p>
            <div
              className={cn(
                "mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition-colors",
                paid
                  ? "bg-brand-teal text-white"
                  : "bg-primary-black/5 text-primary-black/45",
              )}
            >
              {paid && <Check className="h-3.5 w-3.5" aria-hidden />}
              {paid ? "Pagata" : "In attesa"}
            </div>
          </div>
        </div>
      </PhoneChrome>
    </div>
  );
}

function OutroScene({ progress }: { progress: number }) {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/demo/party.jpg"
        alt=""
        fill
        className="object-cover"
        style={{ transform: `scale(${1.05 + progress * 0.06})` }}
        sizes="320px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-black via-primary-black/55 to-primary-black/25" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <Image
          src="/vibeup-mark.png"
          alt=""
          width={64}
          height={64}
          className="rounded-2xl"
          style={{ opacity: Math.min(1, progress * 2.5) }}
        />
        <p
          className="mt-4 text-lg font-black text-white"
          style={{ opacity: Math.min(1, Math.max(0, (progress - 0.2) * 2.5)) }}
        >
          La festa, senza stress
        </p>
      </div>
    </div>
  );
}
