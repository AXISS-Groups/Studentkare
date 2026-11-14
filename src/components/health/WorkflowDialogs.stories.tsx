import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useT } from '@/i18n';
import { AuthProvider } from '@/data/contexts/AuthContext';
import { ThemeProvider } from '@/theme/tokens/theme';
import '@/theme/health-experience.css';
import { NotificationCenterModal } from './NotificationCenterModal';
import { VideoConsultationDialog } from './VideoConsultationDialog';
import { ProviderConsultationDialog } from './ProviderConsultationDialog';
import { LabSlotPickerModal } from './LabSlotPickerModal';

function WorkflowDialogPreview({ kind }: { kind: 'notifications' | 'student' | 'provider' | 'lab' }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <div className="health-experience wf-application">
    <button className="health-button" onClick={() => setOpen(true)}>{t('common.tryAgain')}</button>
    {kind === 'notifications' ? <NotificationCenterModal isOpen={open} onClose={close} /> : !open ? null
      : kind === 'student' ? <VideoConsultationDialog appointment={{ id: 'storybook-consult', slotStart: '2026-11-15T10:00:00Z' }} onClose={close} />
      : kind === 'provider' ? <ProviderConsultationDialog appointment={{ id: 'storybook-consult', customer: 'Test adult' }} onClose={close} />
      : <AuthProvider><LabSlotPickerModal isOpen testName="Test lab" catalogItemId="storybook-lab" onClose={close} /></AuthProvider>}
  </div>;
}

const meta = {
  title: 'Health/Workflow dialogs', component: WorkflowDialogPreview,
  decorators: [(Story) => <ThemeProvider><Story /></ThemeProvider>],
  // Synthetic display-only responses: previewing a call never reaches a provider.
  beforeEach: () => {
    const previous = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ user: null, csrfToken: '', status: 'NOT_STARTED', studentJoined: false, providerJoined: false, liveMedia: false, slots: [] }), { headers: { 'Content-Type': 'application/json' } });
    return () => { globalThis.fetch = previous; };
  },
} satisfies Meta<typeof WorkflowDialogPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Notifications: Story = { args: { kind: 'notifications' } };
export const Student: Story = { args: { kind: 'student' } };
export const Provider: Story = { args: { kind: 'provider' } };
export const LabSignedOut: Story = { args: { kind: 'lab' } };
