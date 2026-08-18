"use client";

import { SafeImage } from "@/components/ui/safe-image";
import { attachAxisLockedHorizontalScroll } from "@/lib/axis-locked-horizontal-scroll";
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
    scroller.scrollTo({ left: next * width, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (activeIndex == null) return;
    if (suppressScrollSyncRef.current) {
      suppressScrollSyncRef.current = false;
      return;
    }
    scrollToIndex(activeIndex);
  }, [activeIndex, scrollToIndex]);

  // Vertical page scroll stays native (touch-action:pan-y). Horizontal photo
  // swipe is applied in JS only after the gesture locks to X — native
  // overflow-x + pan-x/pan-y was trapping iOS when the finger started on the image.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || images.length < 2) return;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    const detachTouch = attachAxisLockedHorizontalScroll(scroller, {
      snapToPage: true,
    });
    return () => {
      scroller.removeEventListener("wheel", onWheel);
      detachTouch();
    };
  }, [images.length]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Kill any vertical drift from touch rubber-banding inside the frame.
    if (scroller.scrollTop !== 0) {
      scroller.scrollTop = 0;
    }
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
        draggable={false}
        className="pointer-events-none select-none object-cover"
        sizes={sizes}
        priority={priority}
      />
    );

    return (
      <div
        className={cn(
          "relative overflow-clip touch-pan-y",
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
    <div
      className={cn("relative overflow-clip", frameClassName, className)}
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="scrollbar-hidden absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overflow-y-clip overscroll-x-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
      >
        {images.map((image, imageIndex) => {
          const imageNode = (
            <SafeImage
              src={image}
              alt={`${alt} — foto ${imageIndex + 1}`}
              fill
              className="pointer-events-none select-none object-cover"
              sizes={sizes}
              priority={priority && imageIndex === 0}
              draggable={false}
            />
          );

          return (
            <div
              key={`${image}-${imageIndex}`}
              className="relative h-full w-full min-w-full max-w-full shrink-0 grow-0 basis-full snap-center snap-always"
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
