"use client";

import Image, { type ImageProps } from "next/image";
import type { CSSProperties } from "react";

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

const noUserDragStyle = { WebkitUserDrag: "none" } as CSSProperties;

export function isDataImageUrl(src: string) {
  return src.startsWith("data:");
}

export function SafeImage({
  src,
  alt,
  className,
  draggable = false,
  ...props
}: SafeImageProps) {
  if (isDataImageUrl(src)) {
    const { fill, sizes, priority, style, ...imgProps } = props;
    void sizes;
    void priority;

    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={className}
          draggable={draggable}
          style={{
            objectFit: "cover",
            width: "100%",
            height: "100%",
            ...noUserDragStyle,
            ...style,
          }}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        draggable={draggable}
        style={{ ...noUserDragStyle, ...style }}
        {...imgProps}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      draggable={draggable}
      {...props}
      style={{ ...noUserDragStyle, ...(props.style ?? {}) }}
    />
  );
}
