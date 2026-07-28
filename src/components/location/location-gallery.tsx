"use client";

import {
  ImageCarousel,
  uniqueImages,
} from "@/components/ui/image-carousel";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import { useState } from "react";

interface LocationGalleryProps {
  images: string[];
  name: string;
}

export function LocationGallery({ images, name }: LocationGalleryProps) {
  const photos = uniqueImages(images);
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) return null;

  return (
    <div className="space-y-3">
      <ImageCarousel
        images={photos}
        alt={name}
        className="rounded-2xl"
        frameClassName="aspect-[4/3] lg:aspect-[16/10]"
        sizes="(max-width: 448px) 100vw, (max-width: 1024px) 448px, 55vw"
        priority
        showDots={false}
        showCounter
        activeIndex={activeIndex}
        onIndexChange={setActiveIndex}
      />

      {photos.length > 1 && (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {photos.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors duration-150",
                activeIndex === index
                  ? "border-brand-teal"
                  : "border-transparent opacity-70",
              )}
              aria-label={`Mostra foto ${index + 1}`}
            >
              <SafeImage
                src={image}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
