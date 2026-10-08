/**
 * Student Kare design system (web). Build screens from these; if something is
 * missing, add a variant here rather than a one-off in the screen.
 * Guide: DESIGN.md §4. Tokens: design/tokens/studentkare.tokens.json.
 */
import './design-system.css';

export { SkIcon } from './icons/SkIcon';
export type { SkIconName } from './icons/SkIcon';
export {
  StatusPill,
  SkButton,
  SkCard,
  Note,
  Avatar,
  Skeleton,
  EmptyStateView,
  ErrorStateView,
  Toast,
  DestinationButton,
} from './primitives';
export type { SkTone } from './primitives';
export { ClinicianShell } from './clinician-shell/ClinicianShell';
export type { ClinicianIdentity, ClinicianShellProps } from './clinician-shell/ClinicianShell';
export type { ClinicianNavId } from './clinician-shell/clinicianNav';
export { StatRow, DataTable } from './data/DataTable';
export type { Stat, StatTone, DataTableColumn, DataTableRow, DataTableCell, CellTone } from './data/DataTable';
export { Timeline } from './data/Timeline';
export type { TimelineEntry, TimelineTone } from './data/Timeline';
export { Drawer } from './overlays/Drawer';
export type { DrawerProps } from './overlays/Drawer';
export { Tabs } from './navigation/Tabs';
export type { TabOption } from './navigation/Tabs';
