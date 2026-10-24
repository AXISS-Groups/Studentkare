import type { ArtSource } from '@/features/phoneKit/artSource';
import vaultRecords from '@/assets/image-8cf36c.png';
import doctorOnScreen from '@/assets/a-doctor-on-a-screen-82be0f.png';
import rxPills from '@/assets/image-a3e6ba.png';
import insightsMicroscope from '@/assets/image-aa86cc.png';
import idVerified from '@/assets/image-5aff5e.png';
import smallClinic from '@/assets/a-small-clinic-building-care-close-to-yo-a054b1.png';

/**
 * Canvas art for the Tier 1 records boards on the web (design boards approved
 * 24 Oct 2026), copied from design/assets with the same names (CLAUDE.md:
 * never hot-link a canvas URL). The Expo app passes its own bundled sources
 * (src/native/phoneArt.ts) to the same views.
 */
export const recordsArt: {
  vaultRecords: ArtSource; vaultEmptyDoctor: ArtSource; rxPills: ArtSource; insightsMicroscope: ArtSource; idVerified: ArtSource; smallClinic: ArtSource;
} = {
  /** image-8cf36c.png — the vault hero. */
  vaultRecords: { uri: vaultRecords },
  /** a-doctor-on-a-screen-82be0f.png — the vault's first-time state. */
  vaultEmptyDoctor: { uri: doctorOnScreen },
  /** image-a3e6ba.png — the Prescriptions tab hero. */
  rxPills: { uri: rxPills },
  /** image-aa86cc.png — Report insights' report card. */
  insightsMicroscope: { uri: insightsMicroscope },
  /** image-5aff5e.png — Digital ID on a desktop. */
  idVerified: { uri: idVerified },
  /** a-small-clinic-building-care-close-to-yo-a054b1.png — the check-in pass's "how it works" on a desktop. */
  smallClinic: { uri: smallClinic },
};
