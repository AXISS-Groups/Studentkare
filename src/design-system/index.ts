/**
 * Studentkare design system — the core set from DESIGN.md §4, built on the
 * generated tokens and React Native primitives so one source serves web and
 * native. ConfirmDialog stays in src/components/interface until it is ported.
 *
 * Web console layer (clinician shell, data tables, overlays, Sk* primitives): built
 * on design-system.css. Its Note/Skeleton/Toast are exported as SkNote/SkSkeleton/SkToast
 * so they never shadow the cross-platform ones above. Guide: DESIGN.md §4.
 */
export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';
export { TextField } from './TextField';
export type { TextFieldProps } from './TextField';
export { Card, Eyebrow, Note } from './Surfaces';
export type { CardProps, NoteProps, NoteTone } from './Surfaces';
export { Stepper } from './Stepper';
export { SwitchRow } from './SwitchRow';
export { RadioGroup } from './RadioGroup';
export type { RadioGroupProps, RadioOption } from './RadioGroup';
export type { SwitchRowProps } from './SwitchRow';
export type { StepperProps } from './Stepper';
export { EmptyState, ErrorState, OfflineBanner, Skeleton } from './States';
export type { EmptyStateProps, ErrorStateProps, OfflineBannerProps, SkeletonProps } from './States';
export { CrisisLinks } from './CrisisLinks';
export { Checkbox, Chip } from './Controls';
export type { CheckboxProps, ChipProps } from './Controls';
export { CodeInput, PhoneInput, Select } from './Inputs';
export type { CodeInputProps, PhoneInputProps, SelectOption, SelectProps } from './Inputs';
export { ListRow } from './ListRow';
export type { ListRowProps } from './ListRow';
export { Toast } from './Toast';
export type { ToastProps, ToastTone } from './Toast';
export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';
export { Table } from './Table';
export type { TableColumn, TableProps } from './Table';
export { ResultMomentView, SourceBadge, VerifiedBadge } from './Moments';
export type { BadgeSource, ResultMoment, ResultMomentProps } from './Moments';
export { Rise, useReducedMotion, usePulse, easing, bezierFromToken } from './motion';
export { TabBar } from './navigation/TabBar';
export type { TabBarItem, TabBarProps } from './navigation/TabBar';

// ---- web console layer ----
import './design-system.css';

export { SkIcon } from './icons/SkIcon';
export type { SkIconName } from './icons/SkIcon';
export {
  StatusPill,
  SkButton,
  SkCard,
  Note as SkNote,
  Avatar,
  Skeleton as SkSkeleton,
  EmptyStateView,
  ErrorStateView,
  Toast as SkToast,
  DestinationButton,
} from './primitives';
export type { SkTone } from './primitives';
export { ConsoleBrand, ConsoleNav, ConsoleSidebarLink, ConsoleTopbar } from './console-shell/ConsoleShell';
export type { ConsoleBrandProps, ConsoleNavGroup, ConsoleNavItem, ConsoleNavProps, ConsoleSearchProps, ConsoleSidebarLinkProps, ConsoleTopbarProps } from './console-shell/ConsoleShell';
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
