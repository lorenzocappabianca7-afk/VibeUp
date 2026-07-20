"use client";

import Image, { type ImageProps } from "next/image";

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

export function isDataImageUrl(src: string) {
  return src.startsWith("data:");
}

export function SafeImage({ src, alt, className, ...props }: SafeImageProps) {
  if (isDataImageUrl(src)) {
    const { fill, sizes, priority, ...imgProps } = props;
    void sizes;
    void priority;

    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={className}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} {...imgProps} />
    );
  }

  return <Image src={src} alt={alt} className={className} {...props} />;
}
