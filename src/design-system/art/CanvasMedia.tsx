import React from 'react';
import { useReducedMotion } from '../motion';
import { canvasImages, canvasVideos, type CanvasImageName, type CanvasVideoName } from './canvasAssets';

interface MediaProps {
  /** Accessible description. Leave empty for decorative art: it is then hidden from screen readers. */
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  testID?: string;
}

/** A raster picture from the design canvas, by its canvas file name. */
export function CanvasImage({ name, alt = '', className, style, width, height, testID }: MediaProps & { name: CanvasImageName }) {
  return (
    <img
      src={canvasImages[name]}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      data-testid={testID}
      data-art={name}
    />
  );
}

/**
 * A looping, muted canvas video. It plays only when the visitor has not asked
 * for reduced motion (DESIGN.md §3); otherwise it shows its first frame still.
 * Decorative unless `alt` is given, and never carries sound or controls.
 */
export function CanvasVideo({ name, alt = '', className, style, width, height, testID }: MediaProps & { name: CanvasVideoName }) {
  const reduced = useReducedMotion();
  return (
    <video
      // Re-mount on a motion preference change so autoplay starts or stops.
      key={reduced ? 'still' : 'moving'}
      src={canvasVideos[name]}
      autoPlay={!reduced}
      loop={!reduced}
      muted
      playsInline
      preload={reduced ? 'metadata' : 'auto'}
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
      role={alt ? 'img' : undefined}
      width={width}
      height={height}
      className={className}
      style={style}
      data-testid={testID}
      data-art={name}
    />
  );
}
