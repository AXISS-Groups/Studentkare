import type { ArtSource } from '@/features/phoneKit/artSource';

/**
 * Canvas art for the phone boards in the Expo app, bundled by Metro from
 * src/assets (the same files the web uses, copied from design/assets).
 */
export const nativePhoneArt: { doctorOnScreen: ArtSource } = {
  doctorOnScreen: require('../assets/a-doctor-on-a-screen-82be0f.png') as ArtSource,
};
