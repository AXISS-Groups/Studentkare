/** GET /work/chronic. Students are room and initials; the API sends no names. */

export interface Programme {
  id: string;
  label: string;
  programme: string;
  target: string;
  /** Epoch seconds. */
  lastReviewAt: number | null;
  nextDueAt: number | null;
  state: string;
  overdueByDays: number | null;
}

export interface ChronicResponse {
  items: Programme[];
  onProgramme: number;
  overdue: number;
  dueThisWeek: number;
  endedByStudent: number;
}
