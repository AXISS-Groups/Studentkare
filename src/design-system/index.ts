/**
 * Studentkare design system — the core set from DESIGN.md §4, built on the
 * generated tokens and React Native primitives so one source serves web and
 * native. Overlays (sheet, side panel, confirm dialog) and inline validation
 * are web DOM components with the same API everywhere on web (overlays/,
 * feedback/); the Sheet has a native twin in Sheet.native.tsx.
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
export { ProgressRing } from './ProgressRing';
export type { ProgressRingProps } from './ProgressRing';
export { SwitchRow } from './SwitchRow';
export { RadioGroup } from './RadioGroup';
export type { RadioGroupProps, RadioOption } from './RadioGroup';
export type { SwitchRowProps } from './SwitchRow';
export type { StepperProps } from './Stepper';
export { EmptyState, ErrorState, OfflineBanner, Skeleton, StateScreen, useOnline } from './States';
export type { EmptyStateProps, ErrorStateProps, OfflineBannerProps, SkeletonProps, StateAction, StateKind, StateScreenProps } from './States';
export { AMBULANCE_NUMBER, CrisisLinks, EMERGENCY_NUMBER, TELE_MANAS_NUMBER } from './CrisisLinks';
export { Checkbox, Chip } from './Controls';
export type { CheckboxProps, ChipProps } from './Controls';
export { CodeInput, PhoneInput, Select } from './Inputs';
export type { CodeInputProps, PhoneInputProps, SelectOption, SelectProps } from './Inputs';
export { ListRow } from './ListRow';
export type { ListRowProps } from './ListRow';
export { Toast } from './Toast';
export type { ToastAction, ToastProps, ToastTone } from './Toast';
export { Banner } from './Banner';
export type { BannerProps, BannerTone } from './Banner';
export { FormField } from './feedback/FormField';
export type { FieldStatus, FormFieldProps } from './feedback/FormField';
export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';
export { Overlay } from './overlays/Overlay';
export type { OverlayProps, OverlayVariant } from './overlays/Overlay';
export { ConfirmDialog } from './overlays/ConfirmDialog';
export type { ConfirmDialogProps, ConfirmDone, ConfirmIcon } from './overlays/ConfirmDialog';
export { SheetOption } from './overlays/SheetOption';
export type { SheetOptionProps } from './overlays/SheetOption';
export { Table } from './Table';
export type { TableColumn, TableProps } from './Table';
export { SourceBadge, VerifiedBadge } from './Moments';
export type { BadgeSource } from './Moments';
export { ResultMomentCard, ResultMomentScreen } from './ResultMoment';
export type { ResultAction, ResultKind, ResultMoment, ResultMomentCardProps, ResultMomentScreenProps, ResultParty } from './ResultMoment';
export { Rise, useReducedMotion, usePulse, easing, bezierFromToken } from './motion';
export { TabBar } from './navigation/TabBar';
export type { TabBarItem, TabBarProps } from './navigation/TabBar';
export { PhoneHeader } from './navigation/PhoneHeader';
export type { PhoneHeaderAction, PhoneHeaderProps } from './navigation/PhoneHeader';
export { usePhoneFrame, PHONE_FRAME_QUERY } from './navigation/usePhoneFrame';

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
export { ConsoleBrand, ConsoleNav, ConsoleSidebarLink, ConsoleTopbar, TeamAccountBadge } from './console-shell/ConsoleShell';
export type { ConsoleBrandProps, ConsoleNavGroup, ConsoleNavItem, ConsoleNavProps, ConsoleSearchProps, ConsoleSidebarLinkProps, ConsoleTopbarProps, TeamAccountBadgeProps } from './console-shell/ConsoleShell';
export { ClinicianShell } from './clinician-shell/ClinicianShell';
export type { ClinicianIdentity, ClinicianShellProps } from './clinician-shell/ClinicianShell';
export type { ClinicianNavId } from './clinician-shell/clinicianNav';
export { StudentWebShell } from './student-shell/StudentWebShell';
export type { StudentShellIdentity, StudentWebShellProps } from './student-shell/StudentWebShell';
export { STUDENT_NAV, studentNavIdFor } from './student-shell/studentNav';
export type { StudentNavId } from './student-shell/studentNav';
export { CampusShell } from './campus-shell/CampusShell';
export type { CampusIdentity, CampusScopeOption, CampusShellProps } from './campus-shell/CampusShell';
export { CAMPUS_NAV, CAMPUS_NAV_ITEMS } from './campus-shell/campusNav';
export type { CampusNavGroup, CampusNavId, CampusNavItem } from './campus-shell/campusNav';
export { StatRow, DataTable } from './data/DataTable';
export type {
  Stat, StatTone, StatRowProps, DataTableColumn, DataTableRow, DataTableCell, CellTone, DataTableRowAction, DataTableSelection,
} from './data/DataTable';
export { ConsoleTablePage, ConsolePageHeader, ConsoleEmptyState, ConsoleErrorState, ConsoleLoadingState } from './console/ConsoleTablePage';
export type {
  ConsoleTablePageProps, ConsolePageHeaderProps, ConsoleTableStatus, ConsoleTableSpec, ConsoleSearch, ConsoleFilters,
  ConsoleFilterOption, ConsoleBulk, ConsolePagination, ConsoleEmpty, ConsoleError, ConsoleBadgeTone,
} from './console/ConsoleTablePage';
export { Timeline } from './data/Timeline';
export type { TimelineEntry, TimelineTone } from './data/Timeline';
export { Drawer } from './overlays/Drawer';
export type { DrawerProps } from './overlays/Drawer';
export { Tabs } from './navigation/Tabs';
export type { TabOption } from './navigation/Tabs';
