import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DataTable, EmptyStateView, ErrorStateView, Skeleton, StatRow, StatusPill } from '@/design-system';
import type { ClinicianNavId } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from './ClinicianConsoleFrame';
import { ConsoleTableViewModel } from './consoleTable';
import type { ConsoleTableConfig, ConsoleTableSource } from './consoleTable';
import './console-table.css';

export interface ConsoleTableViewProps {
  viewModel: ConsoleTableViewModel;
  config: ConsoleTableConfig;
  /** Right of the title, e.g. "Add availability". Shown with the data only. */
  headerAction?: React.ReactNode;
  onNavigate: (route: RoutePath) => void;
}

export const ConsoleTableView = observer(function ConsoleTableView({ viewModel, config, headerAction, onNavigate }: ConsoleTableViewProps): React.ReactElement {
  const { status, data } = viewModel;

  if (status === 'loading') {
    return (
      <div className="ctb-skeleton" aria-busy="true" aria-label={`Loading ${config.title.toLowerCase()}`}>
        <div className="ctb-head">
          <div className="ctb-head__titles"><Skeleton width={240} height={28} /><Skeleton width={360} height={14} /></div>
          <Skeleton width={180} height={40} />
        </div>
        <div className="ctb-skeleton__stats">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={78} />)}</div>
        <div className="ctb-skeleton__table">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} height={44} />)}</div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <ErrorStateView
        title={config.errorTitle}
        onRetry={() => { void viewModel.load(); }}
        onHelp={() => onNavigate('support')}
        reference={config.reference}
      />
    );
  }
  if (status === 'unconnected') {
    return <EmptyStateView {...config.unconnected} action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  }
  if (status === 'empty' || !data) {
    return <EmptyStateView {...config.empty} action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  }

  return (
    <>
      <div className="ctb-head sk-fade">
        <div className="ctb-head__titles">
          <h1 className="ctb-title">{config.title}</h1>
          <p className="ctb-subtitle">{data.subtitle ?? config.subtitle}</p>
        </div>
        <div className="ctb-head__side">
          {data.badge ? (
            <StatusPill tone={data.badge.tone} dot={data.badge.tone === 'danger' ? 'live' : true} className={`ctb-badge ctb-badge--${data.badge.tone}`}>
              {data.badge.label}
            </StatusPill>
          ) : null}
          {headerAction}
        </div>
      </div>
      <StatRow stats={data.stats} />
      <DataTable caption={config.caption} title={config.tableTitle} hideHeadings={config.hideColumnHeadings} columns={config.columns} rows={data.rows} footnote={config.footnote} />
    </>
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
