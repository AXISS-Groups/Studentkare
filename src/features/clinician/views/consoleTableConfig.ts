import type { DataTableColumn } from '@/design-system';
import type { SkIcon3dName } from '@/design-system/icons';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/** Copy and columns for one screen. Everything a reviewer would compare to the picture. */
export interface ConsoleTableConfig {
  title: string;
  subtitle: string;
  /** Visually hidden table caption. */
  caption: string;
  columns: DataTableColumn[];
  /** The design shows no column headings (schedule); they stay for screen readers. */
  hideColumnHeadings?: boolean;
  /** Title inside the table card, e.g. "This week". */
  tableTitle?: string;
  /** The design's closing sentence — why the screen works as it does. */
  footnote: string;
  /** Connected, nothing yet: the board's centred empty state. */
  empty: { title: string; body: string };
  /** The empty state's 3D tile; the doctor boards use `stetho-alt--p4`. */
  emptyIcon?: SkIcon3dName;
  /** The empty state's one next step, e.g. "Open your schedule". */
  emptyAction?: { label: string; route: RoutePath };
  unconnected: { title: string; body: string };
  errorTitle: string;
  /** "Ref LAB-ORDERS · ClinicianLabOrder" */
  reference: string;
  /** The design's four figure labels, shown as "—" until a source reports them. */
  statLabels: readonly [string, string, string, string];
}
