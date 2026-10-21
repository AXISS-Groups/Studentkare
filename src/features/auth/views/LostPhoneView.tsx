import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { LostPhoneViewModel } from '../viewmodel/LostPhoneViewModel';
import { LostPhoneCrisisLine, LostPhonePanel, LostPhoneResult } from './LostPhonePanel';
import type { LostPhoneLinks } from './LostPhonePanel';
import { StandaloneStudentShell } from './StandaloneStudentShell';
import './web-lost-phone.css';

/**
 * Web route /lost-phone (Tier 1, approved 2026-10-21). Public: it must work from
 * a friend's phone, signed out. A signed-in student on a wide screen gets the
 * WebLostPhone board in the student web shell; everyone else the LostPhone
 * phone board. Both report only what POST /auth/sessions/revoke-others confirmed.
 */
export function LostPhoneView(): React.ReactElement {
  const auth = useAuth();
  const phone = usePhoneFrame();
  const [vm] = useState(() => new LostPhoneViewModel());
  useEffect(() => () => vm.dispose(), [vm]);
  const signedIn = auth.status === 'authenticated' && auth.user !== null;
  const links: LostPhoneLinks = {
    signIn: () => navigate('login', 'lost-phone'),
    openDigitalId: () => navigate('digital-id'),
    back: () => navigate(signedIn ? 'security' : 'login'),
    openHelp: signedIn ? () => navigate('support') : undefined,
  };
  if (signedIn && !phone && auth.user?.role === 'STUDENT') {
    return (
      <StandaloneStudentShell route="security">
        <WebLostPhoneBoard viewModel={vm} links={links} />
      </StandaloneStudentShell>
    );
  }
  return <LostPhonePanel viewModel={vm} signedIn={signedIn} links={links} />;
}

/**
 * The WebLostPhone board. The device picker needs a session list the server does
 * not have (D3-7), so the left column is the one honest action: sign out every
 * other device, after the confirm dialog. The right column keeps only claims
 * that are true today (the app lock and photo-matched handover do not exist).
 */
export const WebLostPhoneBoard = observer(function WebLostPhoneBoard({ viewModel: vm, links }: { viewModel: LostPhoneViewModel; links: LostPhoneLinks }) {
  const t = useT();
  return (
    <div className="sk-wlost">
      <div className="sk-wlost__main">
        <h1 className="sk-wlost__title">{t('ident.lost.title')}</h1>
        <p className="sk-wlost__lead">{t('ident.lost.leadWeb')}</p>
        <LostPhoneCrisisLine />

        {vm.phase === 'done' ? (
          <LostPhoneResult viewModel={vm} links={links} />
        ) : (
          <section className="sk-wlost__card" aria-labelledby="sk-wlost-action">
            <span className="sk-wlost__tile"><Icon name="devices" size={22} /></span>
            <div className="sk-wlost__words">
              <h2 id="sk-wlost-action" className="sk-wlost__card-title">{t('lost.title')}</h2>
              <p>{t('lost.body')}</p>
              <p className="sk-wlost__muted">{t('ident.lost.noList')}</p>
            </div>
          </section>
        )}

        {vm.phase === 'failed' ? (
          <div className="sk-wlost__failed" role="alert">
            <Icon name="alert-triangle" size={20} />
            <div>
              <strong>{t('lost.failedTitle')}</strong>
              <p>{t('lost.failedBody')}</p>
            </div>
          </div>
        ) : null}

        {vm.phase !== 'done' ? (
          <button type="button" className="sk-wlost__secure" onClick={vm.askConfirm} disabled={vm.phase === 'busy'} data-testid="lost-secure">
            {t('ident.lost.secure')}
          </button>
        ) : null}
      </div>

      <aside className="sk-wlost__side">
        <section className="sk-wlost__info" aria-labelledby="sk-wlost-cant">
          <h2 id="sk-wlost-cant" className="sk-wlost__eyebrow">{t('ident.lost.cantTitle')}</h2>
          <ul>
            <li><Icon name="check" size={16} strokeWidth={2.6} />{t('ident.lost.cantPass')}</li>
            <li><Icon name="check" size={16} strokeWidth={2.6} />{t('ident.lost.cantSignIn')}</li>
          </ul>
        </section>
        <section className="sk-wlost__report">
          <p>{t('ident.lost.report')}</p>
          {links.openHelp ? (
            <button type="button" className="sk-wlost__link" onClick={links.openHelp}>
              {t('ident.lost.help')}
              <Icon name="arrow-right" size={16} />
            </button>
          ) : null}
        </section>
      </aside>

      <ConfirmDialog
        open={vm.phase === 'confirm' || vm.phase === 'busy'}
        tone="danger"
        icon="end-sessions"
        title={t('ident.lost.confirmTitle')}
        body={t('ident.lost.confirmBody')}
        confirmLabel={t('ident.lost.confirmYes')}
        busyLabel={t('ident.lost.securing')}
        cancelLabel={t('ident.lost.confirmCancel')}
        busy={vm.phase === 'busy'}
        onConfirm={() => void vm.revokeOthers()}
        onCancel={vm.cancelConfirm}
      />
    </div>
  );
});
