import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage } from '@/design-system';
import type { ClinicianNavId, ConsoleTableStatus } from '@/design-system';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from './ClinicianConsoleFrame';
import { ConsoleTableViewModel } from './consoleTable';
import type { ConsoleTableConfig, ConsoleTableSource } from './consoleTable';

export interface ConsoleTableViewProps {
  viewModel: ConsoleTableViewModel;
  config: ConsoleTableConfig;
  /** Right of the title, e.g. "Add availability". Shown with the data only. */
  headerAction?: React.ReactNode;
  /** The empty state's next step when it is an action on this page rather than a route (e.g. "Order test"). */
  emptyAction?: { label: string; onSelect: () => void };
  onNavigate: (route: RoutePath) => void;
}

/**
 * A clinician list board on the design-system console table page. Not connected
 * shows the real layout with blank figures and an empty table — never sample rows.
 */
export const ConsoleTableView = observer(function ConsoleTableView({ viewModel, config, headerAction, emptyAction: emptyOverride, onNavigate }: ConsoleTableViewProps): React.ReactElement {
  const t = useT();
  const { status, data } = viewModel;
  const pageStatus: ConsoleTableStatus = status;
  const emptyAction = config.emptyAction;
  return (
    <ConsoleTablePage
      status={pageStatus}
      header={{
        title: config.title,
        subtitle: data?.subtitle ?? config.subtitle,
        badge: data?.badge,
        actions: status === 'ready' ? headerAction : undefined,
      }}
      stats={data?.stats}
      statLabels={config.statLabels}
      table={{
        caption: config.caption,
        title: config.tableTitle,
        hideHeadings: config.hideColumnHeadings,
        columns: config.columns,
        rows: data?.rows ?? [],
        footnote: config.footnote,
      }}
      empty={{
        title: config.empty.title,
        body: config.empty.body,
        icon3d: config.emptyIcon ?? 'stetho-alt--p4',
        action: emptyOverride ?? (emptyAction ? { label: emptyAction.label, onSelect: () => onNavigate(emptyAction.route) } : undefined),
      }}
      unconnected={config.unconnected}
      error={{
        title: config.errorTitle,
        reference: config.reference,
        onRetry: () => { void viewModel.load(); },
        onHelp: () => onNavigate('support'),
      }}
      loadingLabel={t('console.loading', { title: config.title.toLowerCase() })}
    />
  );
});

export interface ConsoleTableScreenProps {
  navId: ClinicianNavId;
  config: ConsoleTableConfig;
  source: ConsoleTableSource;
  headerAction?: React.ReactNode;
}

/** A clinician list screen inside the console frame. */
export function ConsoleTableScreen({ navId, config, source, headerAction }: ConsoleTableScreenProps): React.ReactElement {
  const [viewModel] = useState(() => new ConsoleTableViewModel(source));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current={navId} context={config.title}>
      <ConsoleTableView viewModel={viewModel} config={config} headerAction={headerAction} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
