import { useEffect } from 'react';
import type { MedsTodayViewModel } from '../viewmodel/MedsTodayViewModel';

/** How often an open undo is re-checked against the server's `undoUntil` (structural: a UI tick, not a business value). */
const UNDO_TICK_MS = 15_000;

/** Re-reads the clock while the screen is up, so an undo disappears once its window closes. */
export function useUndoClock(vm: MedsTodayViewModel): void {
  useEffect(() => {
    const id = setInterval(() => vm.tick(), UNDO_TICK_MS);
    return () => clearInterval(id);
  }, [vm]);
}
