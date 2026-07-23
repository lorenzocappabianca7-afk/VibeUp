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
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
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

  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

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
    (nextX: number, nextY: number, nextZoom = zoomRef.current) => {
      if (!imageSize.width || !imageSize.height) return;
      const clamped = clampOffset(
        nextX,
        nextY,
        imageSize.width,
        imageSize.height,
        VIEWPORT,
        nextZoom,
      );
      offsetRef.current = clamped;
      setOffset(clamped);
    },
    [imageSize.height, imageSize.width],
  );

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      zoomRef.current = clamped;
      setZoom(clamped);
      applyOffset(offsetRef.current.x, offsetRef.current.y, clamped);
    },
    [applyOffset],
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
        originX: offsetRef.current.x,
        originY: offsetRef.current.y,
      };
      pinchRef.current = null;
      return;
    }

    if (activePointers.current.size === 2) {
      dragRef.current = null;
      pinchRef.current = {
        distance: pointerDistance(),
        zoom: zoomRef.current,
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
          originX: offsetRef.current.x,
          originY: offsetRef.current.y,
        };
      }
    }
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    applyZoom(zoomRef.current + delta);
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
        zoom: zoomRef.current,
        offsetX: offsetRef.current.x,
        offsetY: offsetRef.current.y,
      });
      onConfirm(dataUrl);
    } catch {
      setError("Non riesco a ritagliare la foto. Riprova.");
      setSaving(false);
    }
  }

  // Uniform base fit (cover). Zoom is a single scale() — never stretches X≠Y.
  const baseScale =
    imageSize.width && imageSize.height
      ? coverScale(imageSize.width, imageSize.height, VIEWPORT)
      : 1;
  const baseW = imageSize.width * baseScale;
  const baseH = imageSize.height * baseScale;

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
              Zoom uniforme · proporzioni invariate
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
            className="relative touch-none overflow-hidden rounded-[2rem] bg-black"
            style={{ width: VIEWPORT + 48, height: VIEWPORT + 48 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
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
                    width: baseW,
                    // Height follows natural aspect ratio — never set a mismatched pair.
                    height: baseH,
                    aspectRatio: `${imageSize.width} / ${imageSize.height}`,
                    objectFit: "fill",
                    left: VIEWPORT / 2 - baseW / 2,
                    top: VIEWPORT / 2 - baseH / 2,
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
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
            Trascina per spostare · pizzica con due dita per lo zoom
          </p>

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
