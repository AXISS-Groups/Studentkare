import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer, FormField, SkButton, SkToast as Toast, useOnline } from '@/design-system';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from './ClinicianConsoleFrame';
import { ConsoleTableView } from './ConsoleTableScreen';
import { ConsoleTableViewModel } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableSource } from '../viewmodel/ConsoleTableViewModel';
import type { ConsoleTableConfig } from './consoleTableConfig';
import { OfflineNote } from './OfflineNote';
import type { T } from '../model/clinicalData';
import { DoctorLabOrderViewModel, INDICATION_MAX, INDICATION_MIN } from '../viewmodel/DoctorLabOrderViewModel';
import { labOrdersApiSource } from '../viewmodel/labOrdersBoard';
import './lab-orders.css';

/**
 * ClinicianLabOrder (design page 5, Tier 1, approved 2026-10-21) on
 * `GET/POST /work/doctor-lab-orders`. The order form is the tested
 * DoctorLabOrderViewModel: a patient in the doctor's care, an NABL lab's
 * catalogue test, and a typed clinical indication — required by the server
 * too (422 under three characters). Nothing is priced or charged here.
 */
export function labOrdersConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinLab.title'),
    subtitle: t('clinLab.subtitle'),
    caption: t('clinLab.caption'),
    columns: [
      { label: t('clinLab.col.student'), width: '150px' },
      { label: t('clinLab.col.panel') },
      { label: t('clinLab.col.prep'), width: '170px' },
      { label: t('clinLab.col.lab'), width: '150px' },
      { label: t('clinLab.col.state'), width: '170px', align: 'end' },
    ],
    footnote: t('clinLab.footnote'),
    empty: { title: t('clinLab.emptyTitle'), body: t('clinLab.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinLab.unconnectedTitle'), body: t('clinLab.unconnectedBody') },
    errorTitle: t('clinLab.errorTitle'),
    reference: t('clinLab.reference'),
    statLabels: [t('clinLab.stat.open'), t('clinLab.stat.urgent'), t('clinLab.stat.fasting'), t('clinLab.stat.indication')],
  };
}

const OrderDrawer = observer(function OrderDrawer({ vm, open, online, onClose, onPlaced }: { vm: DoctorLabOrderViewModel; open: boolean; online: boolean; onClose: () => void; onPlaced: () => void }): React.ReactElement | null {
  const t = useT();
  if (!open) return null;
  const length = vm.indication.trim().length;
  return (
    <Drawer open title={t('clinLab.order')} busy={vm.busy} onClose={onClose}>
      {vm.placed ? (
        <div className="cl-placed" role="status">
          <strong>{t('partner.clin.lab.placedTitle')}</strong>
          <p>{t('partner.clin.lab.placedLine', { test: vm.placed.testName, name: vm.placed.patientName || t('partner.clin.lab.yourPatient') })}</p>
          <p>{t('partner.clin.lab.noCharge')}</p>
          <SkButton variant="secondary" onClick={vm.startAnother}>{t('partner.clin.lab.another')}</SkButton>
        </div>
      ) : (
        <form className="cl-form" onSubmit={(event) => { event.preventDefault(); if (online) void vm.submit().then(() => { if (vm.placed) onPlaced(); }); }}>
          <FormField label={t('partner.clin.rx.patientField')} hint={vm.patientsFailed ? t('partner.clin.lab.patientsFailed') : vm.patients?.length === 0 ? t('partner.clin.lab.noPatientsBody') : undefined}>
            <select required value={vm.patientId} onChange={(e) => vm.selectPatient(e.target.value)} data-autofocus>
              <option value="">{t('partner.clin.rx.choosePatient')}</option>
              {(vm.patients ?? []).map((p) => <option key={p.patientId} value={p.patientId}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label={t('partner.clin.lab.testField')} hint={vm.testsFailed ? t('partner.clin.lab.testsFailed') : vm.selectedTest ? t('partner.clin.lab.testHint', { lab: vm.selectedTest.labName, prep: vm.selectedTest.preparation || '—' }) : vm.tests?.length === 0 ? t('partner.clin.lab.noTestsBody') : undefined}>
            <select required value={vm.testId} onChange={(e) => vm.selectTest(e.target.value)}>
              <option value="">{t('partner.clin.lab.chooseTest')}</option>
              {(vm.tests ?? []).map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
            </select>
          </FormField>
          <fieldset className="cl-modes">
            <legend className="cl-legend">{t('partner.clin.lab.mode')}</legend>
            <label className="cl-choice"><input type="radio" name="cl-mode" checked={vm.collectionMode === 'WALK_IN'} onChange={() => vm.setCollectionMode('WALK_IN')} />{t('partner.clin.lab.walkIn')}</label>
            <label className="cl-choice"><input type="radio" name="cl-mode" disabled={!vm.hostelAvailable} checked={vm.collectionMode === 'HOME'} onChange={() => vm.setCollectionMode('HOME')} />{t('partner.clin.lab.hostel')}</label>
            {vm.selectedTest && !vm.hostelAvailable ? <small className="cl-small">{t('partner.clin.lab.noHostel')}</small> : null}
          </fieldset>
          <label className="cl-choice"><input type="checkbox" checked={vm.fastingRequired} onChange={(e) => vm.setFastingRequired(e.target.checked)} />{t('partner.clin.lab.fasting')}</label>
          <FormField
            label={t('partner.clin.lab.indication')}
            status={length > 0 && !vm.indicationValid ? 'invalid' : 'idle'}
            message={t('clinLab.indicationNeeded', { min: INDICATION_MIN })}
            hint={t('partner.clin.lab.indicationHint', { min: INDICATION_MIN, max: INDICATION_MAX, count: length })}
          >
            <textarea required rows={3} minLength={INDICATION_MIN} maxLength={INDICATION_MAX} value={vm.indication} onChange={(e) => vm.setIndication(e.target.value)} />
          </FormField>
          <small className="cl-small">{t('partner.clin.lab.indicationWhy')}</small>
          {vm.error ? <p className="cl-error" role="alert">{vm.error}</p> : null}
          {!online ? <small className="cl-small" role="status">{t('clinShared.offlineWrite')}</small> : null}
          <small className="cl-small">{t('partner.clin.lab.noCharge')}</small>
          <SkButton type="submit" busy={vm.busy} disabled={!vm.canSubmit || !online}>{t('partner.clin.lab.submit')}</SkButton>
        </form>
      )}
    </Drawer>
  );
});

export function ClinicianLabOrdersScreen({ source, orderViewModel }: { source?: ConsoleTableSource; orderViewModel?: DoctorLabOrderViewModel }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const config = useMemo(() => labOrdersConfig(t), [t]);
  const [table] = useState(() => new ConsoleTableViewModel(source ?? labOrdersApiSource(t)));
  const [order] = useState(() => orderViewModel ?? new DoctorLabOrderViewModel());
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { void table.load(); }, [table]);
  // Live while mounted. StrictMode mounts, disposes and mounts again: activate() on every mount.
  useEffect(() => { order.activate(); return () => order.dispose(); }, [order]);
  const openOrder = () => {
    order.startAnother();
    setDrawer(true);
    void Promise.all([order.loadPatients(), order.loadTests()]);
  };
  return (
    <ClinicianConsoleFrame current="lab-orders" context={config.title}>
      <OfflineNote online={online} loadedAt={null} />
      <ConsoleTableView
        viewModel={table}
        config={config}
        onNavigate={navigate}
        headerAction={<SkButton onClick={openOrder} disabled={!online}>{t('clinLab.order')}</SkButton>}
        emptyAction={online ? { label: t('clinLab.order'), onSelect: openOrder } : undefined}
      />
      <OrderDrawer vm={order} open={drawer} online={online} onClose={() => { if (!order.busy) setDrawer(false); }} onPlaced={() => { setToast(t('clinLab.toast.placed')); void table.load(); }} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </ClinicianConsoleFrame>
  );
}
