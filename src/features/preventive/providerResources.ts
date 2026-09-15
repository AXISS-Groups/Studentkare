import type { RoutePath } from '@/lib/workflowRouting';

/**
 * Studentkare's own in-app care destinations. These are internal routes, not
 * external provider links, and no third-party catalog feed or partnership is
 * implied.
 */
export const careServices: readonly { title: string; description: string; route: RoutePath }[] = [
  { title: 'Medicines & health products', description: 'Browse the Studentkare marketplace for medicines and wellness products. Prescriptions and availability are checked before fulfilment.', route: 'shop' },
  { title: 'Lab tests & packages', description: 'Compare lab tests and preparation requirements in the Studentkare marketplace. Ask your clinician which tests are appropriate.', route: 'shop' },
  { title: 'Doctor consultations', description: 'Find care and request a consultation through Studentkare.', route: 'care' },
  { title: 'Current offers', description: 'Check current Studentkare offers, eligibility and prices in the marketplace.', route: 'shop' },
];

export const influenzaSource = 'https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)';
