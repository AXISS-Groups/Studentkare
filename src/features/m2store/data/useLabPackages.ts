import { useCallback, useEffect, useState } from 'react';
import { labBookingRepository } from '@/features/labBooking/data/LabBookingRepository';
import type { LabBookingRepository, LabPackage } from '@/features/labBooking/data/LabBookingRepository';

export type LabsPhase = 'loading' | 'ready' | 'error';

/**
 * The bookable lab tests (GET /lab-packages, catalogue order) for Mobile 2.0
 * Lab tests. Catalogue data only: nothing here reads the student's own lab
 * orders or results (Rule L; the doctor-ordered repeat test lives on My health).
 */
export function useLabPackages(repository: Pick<LabBookingRepository, 'packages'> = labBookingRepository) {
  const [phase, setPhase] = useState<LabsPhase>('loading');
  const [items, setItems] = useState<LabPackage[]>([]);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    setPhase('loading');
    repository.packages().then((list) => {
      if (!live) return;
      setItems(list);
      setPhase('ready');
    }, () => { if (live) setPhase('error'); });
    return () => { live = false; };
  }, [repository, version]);
  return { phase, items, reload };
}

/** The package with the most tests in it (the "Full body" shortcut and the hero), or null. */
export function biggestPackage(items: readonly LabPackage[]): LabPackage | null {
  return items.reduce<LabPackage | null>((best, p) => (!best || p.includes.length > best.includes.length ? p : best), null);
}

/** Packages whose name or tests contain the words typed (case-insensitive). */
export function matchPackages(items: readonly LabPackage[], query: string): LabPackage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((p) => p.name.toLowerCase().includes(q) || p.includes.some((name) => name.toLowerCase().includes(q)));
}
