"use client";

import { SoftNavLink } from "@/components/navigation/soft-nav-link";
import {
  ImageCarousel,
  uniqueImages,
} from "@/components/ui/image-carousel";
import type { ServiceProvider } from "@/lib/mock/service-providers";
import { cn, formatCurrency } from "@/lib/utils";
import { MUSIC_TYPE_LABELS } from "@/types/location";
import { Disc3, Heart, MapPin } from "lucide-react";
import { memo, useMemo } from "react";

interface DjCardProps {
  dj: ServiceProvider;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  href?: string;
}

export const DjCard = memo(function DjCard({
  dj,
  isFavorite,
  onToggleFavorite,
  href = `/service/${dj.id}?category=dj`,
}: DjCardProps) {
  const photos = useMemo(
    () => uniqueImages([dj.imageUrl, ...(dj.galleryImageUrls ?? [])]),
    [dj.galleryImageUrls, dj.imageUrl],
  );
  const musicTypes = dj.musicTypes?.slice(0, 3) ?? [];

  return (
    <article className="render-contained h-full overflow-clip rounded-2xl border border-primary-black/12 bg-background shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-primary-black">
      <div className="relative">
        {photos.length > 0 ? (
          <ImageCarousel
            images={photos}
            alt={dj.name}
            frameClassName="aspect-[16/10]"
            sizes="(max-width: 640px) 72vw, 18rem"
            showDots={photos.length > 1}
            renderSlide={(_image, _index, imageNode) => (
              <SoftNavLink
                href={href}
                className="absolute inset-0 block touch-pan-y"
                draggable={false}
              >
                {imageNode}
              </SoftNavLink>
            )}
          />
        ) : (
          <SoftNavLink
            href={href}
            className="relative flex aspect-[16/10] items-center justify-center bg-brand-teal/12 text-brand-teal"
          >
            <Disc3 className="h-10 w-10" aria-hidden />
            <span className="sr-only">{dj.name}</span>
          </SoftNavLink>
        )}

        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(dj.id);
            }}
            aria-label={
              isFavorite
                ? `Rimuovi ${dj.name} dai preferiti`
                : `Aggiungi ${dj.name} ai preferiti`
            }
            className={cn(
              "touch-target touch-feedback flex items-center justify-center rounded-full shadow-md backdrop-blur-md transition-colors duration-150",
              isFavorite
                ? "bg-brand-pink text-white"
                : "bg-surface text-primary-black hover:bg-surface/90",
            )}
          >
            <Heart
              className="h-4 w-4"
              strokeWidth={2.75}
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <SoftNavLink href={href} className="block p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-primary-black">
              {dj.name}
            </h3>
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-primary-black/50">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{dj.providerZone}</span>
            </p>
            {musicTypes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {musicTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-brand-pink/12 px-2 py-0.5 text-[10px] font-bold text-primary-black"
                  >
                    {MUSIC_TYPE_LABELS[type]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <p className="shrink-0 self-start sm:text-right">
            <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-inverse">
              da {formatCurrency(dj.price)}
            </span>
            <span className="mt-1 block text-[10px] font-bold text-primary-black/50">
              /{dj.priceSuffix}
            </span>
          </p>
        </div>
      </SoftNavLink>
    </article>
  );
});
