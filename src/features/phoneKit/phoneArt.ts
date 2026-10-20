import type { ArtSource } from './artSource';
import doctorOnScreen from '@/assets/a-doctor-on-a-screen-82be0f.png';
import orderPlaced from '@/assets/image-cb61b7.jpg';
import refillVideo from '@/assets/video-379108.mp4';

/**
 * Canvas art for the phone boards on the web, copied from design/assets with
 * the same names (CLAUDE.md: never hot-link a canvas URL). The Expo app passes
 * its own bundled sources to the same views.
 */
export const phoneArt: { doctorOnScreen: ArtSource; orderPlaced: ArtSource } = {
  /** a-doctor-on-a-screen-82be0f.png — DoctorResults hero. */
  doctorOnScreen: { uri: doctorOnScreen },
  /** image-cb61b7.jpg — OrderSuccess. */
  orderPlaced: { uri: orderPlaced },
};

/** video-379108.mp4 — the ShopHome refill card loop (web only). */
export const refillVideoUrl: string = refillVideo;
