"use client";

import {
  clampOffset,
  coverScale,
  exportCircularAvatar,
  loadImage,
  readFileAsDataUrl,
} from "@/lib/avatar-crop";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/utils";
import { Minus, Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const VIEWPORT = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface AvatarCropModalProps {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

export function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  useBodyScrollLock(true);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
  } | null>(null);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImage(dataUrl);
        if (cancelled) return;
        setImageSrc(dataUrl);
        setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
        setZoom(MIN_ZOOM);
        setOffset({ x: 0, y: 0 });
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Non riesco a leggere questa foto. Prova con un altro file.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const applyOffset = useCallback(
    (nextX: number, nextY: number, nextZoom = zoom) => {
      if (!imageSize.width || !imageSize.height) return;
      setOffset(
        clampOffset(
          nextX,
          nextY,
          imageSize.width,
          imageSize.height,
          VIEWPORT,
          nextZoom,
        ),
      );
    },
    [imageSize.height, imageSize.width, zoom],
  );

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      setZoom(clamped);
      applyOffset(offset.x, offset.y, clamped);
    },
    [applyOffset, offset.x, offset.y],
  );

  function pointerDistance() {
    const points = [...activePointers.current.values()];
    if (points.length < 2) return 0;
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointers.current.size === 1) {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
      };
      pinchRef.current = null;
      return;
    }

    if (activePointers.current.size === 2) {
      dragRef.current = null;
      pinchRef.current = {
        distance: pointerDistance(),
        zoom,
      };
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!activePointers.current.has(event.pointerId)) return;
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointers.current.size >= 2 && pinchRef.current) {
      const distance = pointerDistance();
      if (pinchRef.current.distance > 0) {
        const ratio = distance / pinchRef.current.distance;
        applyZoom(pinchRef.current.zoom * ratio);
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    applyOffset(
      drag.originX + (event.clientX - drag.startX),
      drag.originY + (event.clientY - drag.startY),
    );
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    activePointers.current.delete(event.pointerId);
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
    if (activePointers.current.size < 2) {
      pinchRef.current = null;
    }
    if (activePointers.current.size === 1) {
      const [remaining] = activePointers.current.entries();
      if (remaining) {
        const [pointerId, point] = remaining;
        dragRef.current = {
          pointerId,
          startX: point.x,
          startY: point.y,
          originX: offset.x,
          originY: offset.y,
        };
      }
    }
  }

  async function handleConfirm() {
    if (!imageSrc || saving) return;
    setSaving(true);
    setError(null);

    try {
      const image = await loadImage(imageSrc);
      const dataUrl = await exportCircularAvatar({
        image,
        viewport: VIEWPORT,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
      });
      onConfirm(dataUrl);
    } catch {
      setError("Non riesco a ritagliare la foto. Riprova.");
      setSaving(false);
    }
  }

  const scale =
    imageSize.width && imageSize.height
      ? coverScale(imageSize.width, imageSize.height, VIEWPORT) * zoom
      : 1;
  const drawnW = imageSize.width * scale;
  const drawnH = imageSize.height * scale;

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-primary-black/55"
        onClick={onCancel}
        aria-label="Annulla ritaglio foto"
      />

      <div
        className="vibe-sheet-enter relative flex max-h-[min(94dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-primary-black text-white shadow-xl sm:rounded-[2rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
      >
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <div className="min-w-0">
            <h2
              id="avatar-crop-title"
              className="text-base font-black text-white"
            >
              Ritaglia la foto
            </h2>
            <p className="mt-0.5 text-xs text-white/55">
              Sposta e ingrandisci come su WhatsApp
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/15"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-3">
          <div
            ref={stageRef}
            className="relative touch-none overflow-hidden rounded-[2rem] bg-black"
            style={{ width: VIEWPORT + 48, height: VIEWPORT + 48 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              className="absolute left-1/2 top-1/2 overflow-hidden rounded-full bg-primary-black/40"
              style={{
                width: VIEWPORT,
                height: VIEWPORT,
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 0 999px rgba(0,0,0,0.55)",
              }}
            >
              {imageSrc && imageSize.width > 0 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="absolute max-w-none select-none"
                  style={{
                    width: drawnW,
                    height: drawnH,
                    left: VIEWPORT / 2 - drawnW / 2 + offset.x,
                    top: VIEWPORT / 2 - drawnH / 2 + offset.y,
                  }}
                />
              )}
            </div>
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 border-white/80"
              style={{
                width: VIEWPORT,
                height: VIEWPORT,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>

          <p className="mt-3 text-center text-[11px] font-medium text-white/50">
            Trascina per spostare · pizzica o usa lo slider per lo zoom
          </p>

          <div className="mt-4 flex w-full max-w-[280px] items-center gap-3">
            <button
              type="button"
              onClick={() => applyZoom(zoom - 0.15)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label="Rimpicciolisci"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => applyZoom(Number(event.target.value))}
              className="h-1.5 w-full accent-brand-teal"
              aria-label="Zoom foto"
            />
            <button
              type="button"
              onClick={() => applyZoom(zoom + 0.15)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label="Ingrandisci"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-2xl bg-brand-pink/20 px-3 py-2 text-center text-xs font-semibold text-brand-pink">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/85"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!imageSrc || saving}
            className={cn(
              "rounded-2xl bg-brand-teal px-4 py-3 text-sm font-black text-primary-black transition-opacity",
              (!imageSrc || saving) && "opacity-50",
            )}
          >
            {saving ? "Salvo…" : "Usa foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
