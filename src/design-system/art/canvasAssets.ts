/**
 * Raster art and video from the design canvas (`design/assets`), copied into
 * `src/assets` with the same file names (CLAUDE.md: never hot-link a canvas URL).
 *
 * The set is the media the public site boards (canvas page 3a) use. A screen
 * that needs another canvas file copies it into `src/assets` under its canvas
 * name and adds one line here; screens refer to art by that name only.
 *
 * Inline SVG illustrations, 3D tiles and glyphs are not here: they are drawn by
 * `<Illustration>`, `<Icon3d>` and `<Glyph>` from `../icons`.
 */
import doctorVideoConsult from '@/assets/a-doctor-on-a-video-consult-460112.png';
import doctorWaving from '@/assets/a-friendly-doctor-waving-hello-b859fc.png';
import glossyHeart from '@/assets/a-glossy-3d-heart-beating-gently-350fa7.png';
import imageAa86cc from '@/assets/image-aa86cc.png';
import imageB2694b from '@/assets/image-b2694b.png';
import imageCcaceb from '@/assets/image-ccaceb.png';
import imageE4c535 from '@/assets/image-e4c535.png';
import video09075f from '@/assets/video-09075f.mp4';
import video2c18e6 from '@/assets/video-2c18e6.mp4';
import video4486f2 from '@/assets/video-4486f2.mp4';
import videoFabac8 from '@/assets/video-fabac8.mp4';

export const canvasImages = {
  'a-doctor-on-a-video-consult-460112.png': doctorVideoConsult,
  'a-friendly-doctor-waving-hello-b859fc.png': doctorWaving,
  'a-glossy-3d-heart-beating-gently-350fa7.png': glossyHeart,
  'image-aa86cc.png': imageAa86cc,
  'image-b2694b.png': imageB2694b,
  'image-ccaceb.png': imageCcaceb,
  'image-e4c535.png': imageE4c535,
} as const;

export const canvasVideos = {
  'video-09075f.mp4': video09075f,
  'video-2c18e6.mp4': video2c18e6,
  'video-4486f2.mp4': video4486f2,
  'video-fabac8.mp4': videoFabac8,
} as const;

export type CanvasImageName = keyof typeof canvasImages;
export type CanvasVideoName = keyof typeof canvasVideos;
