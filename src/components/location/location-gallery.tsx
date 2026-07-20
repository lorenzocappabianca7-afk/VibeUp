"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

interface LocationGalleryProps {
  images: string[];
  name: string;
}

export function LocationGallery({ images, name }: LocationGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-[16/10]">
        <Image
          src={images[activeIndex]}
          alt={`${name} — foto ${activeIndex + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 448px) 100vw, (max-width: 1024px) 448px, 55vw"
          priority
        />
        <div className="absolute bottom-3 right-3 rounded-full bg-primary-black/70 px-2.5 py-1 text-xs font-medium text-white">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {images.map((image, index) => (
          <button
            key={image}
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
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
