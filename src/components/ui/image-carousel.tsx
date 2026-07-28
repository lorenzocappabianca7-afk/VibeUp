"use client";

import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function uniqueImages(images: Array<string | null | undefined>): string[] {
  return images.filter(
    (image, index, list): image is string =>
      Boolean(image) && list.indexOf(image) === index,
  );
}

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  /** Applied to the carousel viewport (aspect + overflow). */
  frameClassName?: string;
  sizes?: string;
  priority?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap each slide (e.g. SoftNavLink). Receives the filled image node. */
  renderSlide?: (
    image: string,
    index: number,
    imageNode: ReactNode,
  ) => ReactNode;
}

export function ImageCarousel({
  images,
  alt,
  className,
  frameClassName = "aspect-[16/10]",
  sizes = "(max-width: 448px) 100vw, 448px",
  priority = false,
  showDots = true,
  showCounter = false,
  activeIndex,
  onIndexChange,
  renderSlide,
}: ImageCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const suppressScrollSyncRef = useRef(false);
  const currentIndex = activeIndex ?? index;

  const setCurrentIndex = useCallback(
    (next: number) => {
      setIndex(next);
      onIndexChange?.(next);
    },
    [onIndexChange],
  );

  const scrollToIndex = useCallback((next: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const width = scroller.clientWidth;
    scroller.scrollTo({ left: next * width, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (activeIndex == null) return;
    if (suppressScrollSyncRef.current) {
      suppressScrollSyncRef.current = false;
      return;
    }
    scrollToIndex(activeIndex);
  }, [activeIndex, scrollToIndex]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const width = scroller.clientWidth || 1;
    const next = Math.round(scroller.scrollLeft / width);
    const clamped = Math.max(0, Math.min(images.length - 1, next));
    if (clamped !== currentIndex) {
      suppressScrollSyncRef.current = true;
      setCurrentIndex(clamped);
    }
  }

  if (images.length === 0) return null;

  if (images.length === 1) {
    const imageNode = (
      <SafeImage
        src={images[0]}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />
    );

    return (
      <div
        className={cn(
          "relative overflow-hidden",
          frameClassName,
          className,
        )}
      >
        {renderSlide ? renderSlide(images[0], 0, imageNode) : imageNode}
        {showCounter && (
          <div className="absolute bottom-3 right-3 z-[1] rounded-full bg-ink-inverse/70 px-2.5 py-1 text-xs font-medium text-white">
            1 / 1
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className={cn(
          "scrollbar-hidden flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch]",
          frameClassName,
        )}
      >
        {images.map((image, imageIndex) => {
          const imageNode = (
            <SafeImage
              src={image}
              alt={`${alt} — foto ${imageIndex + 1}`}
              fill
              className="object-cover"
              sizes={sizes}
              priority={priority && imageIndex === 0}
            />
          );

          return (
            <div
              key={`${image}-${imageIndex}`}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              {renderSlide
                ? renderSlide(image, imageIndex, imageNode)
                : imageNode}
            </div>
          );
        })}
      </div>

      {showCounter && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[1] rounded-full bg-ink-inverse/70 px-2.5 py-1 text-xs font-medium text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {showDots && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1] flex -translate-x-1/2 gap-1.5">
          {images.map((_, dotIndex) => (
            <span
              key={dotIndex}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                dotIndex === currentIndex ? "bg-paper" : "bg-white/45",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
