import type { ArtSource } from '@/features/phoneKit/artSource';

/**
 * Canvas art for the phone boards in the Expo app, bundled by Metro from
 * src/assets (the same files the web uses, copied from design/assets).
 */
export const nativePhoneArt: { doctorOnScreen: ArtSource; vaultRecords: ArtSource; rxPills: ArtSource } = {
  doctorOnScreen: require('../assets/a-doctor-on-a-screen-82be0f.png') as ArtSource,
  /** image-8cf36c.png — the Health vault hero (Tier 1 parity plan §6). */
  vaultRecords: require('../assets/image-8cf36c.png') as ArtSource,
  /** image-a3e6ba.png — the vault's Prescriptions tab hero (§7). */
  rxPills: require('../assets/image-a3e6ba.png') as ArtSource,
};
