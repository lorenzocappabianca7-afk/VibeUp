/** Helpers for circular avatar crop (WhatsApp-style). */

export const AVATAR_OUTPUT_SIZE = 512;

export function coverScale(
  imageWidth: number,
  imageHeight: number,
  viewport: number,
) {
  return Math.max(viewport / imageWidth, viewport / imageHeight);
}

export function clampOffset(
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  viewport: number,
  zoom: number,
) {
  const scale = coverScale(imageWidth, imageHeight, viewport) * zoom;
  const drawnW = imageWidth * scale;
  const drawnH = imageHeight * scale;
  const maxX = Math.max(0, (drawnW - viewport) / 2);
  const maxY = Math.max(0, (drawnH - viewport) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offsetX)),
    y: Math.min(maxY, Math.max(-maxY, offsetY)),
  };
}

/**
 * Renders the circular crop from the interactive editor into a PNG data URL.
 * The editor shows a circular viewport of `viewport` CSS pixels; the exported
 * image is a square PNG with transparent corners outside the circle.
 */
export async function exportCircularAvatar(options: {
  image: HTMLImageElement;
  viewport: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  outputSize?: number;
}): Promise<string> {
  const {
    image,
    viewport,
    zoom,
    offsetX,
    offsetY,
    outputSize = AVATAR_OUTPUT_SIZE,
  } = options;

  const scale = coverScale(image.naturalWidth, image.naturalHeight, viewport) * zoom;
  const drawnW = image.naturalWidth * scale;
  const drawnH = image.naturalHeight * scale;
  const left = viewport / 2 - drawnW / 2 + offsetX;
  const top = viewport / 2 - drawnH / 2 + offsetY;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas non disponibile");
  }

  const ratio = outputSize / viewport;
  ctx.clearRect(0, 0, outputSize, outputSize);
  ctx.save();
  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    left * ratio,
    top * ratio,
    drawnW * ratio,
    drawnH * ratio,
  );
  ctx.restore();

  return canvas.toDataURL("image/png");
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Lettura file non valida"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Lettura fallita"));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Immagine non valida"));
    image.src = src;
  });
}
