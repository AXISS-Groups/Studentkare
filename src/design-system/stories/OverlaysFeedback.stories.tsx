import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View } from 'react-native';
import { Banner, ConfirmDialog, Drawer, FormField, Sheet, SheetOption, Toast } from '..';
import type { ConfirmIcon } from '..';

const meta = { title: 'Design system/Overlays and feedback (boards Sheets, ConfirmDialogs, Feedback)' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function Confirm({ icon, tone, title, body, cancel, cta, busyLabel, done }: {
  icon: ConfirmIcon; tone: 'action' | 'danger'; title: string; body: string; cancel?: string; cta: string; busyLabel: string; done: string;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | null>('idle');
  return (
    <>
      <button type="button" onClick={() => setState('idle')}>Open</button>
      <ConfirmDialog
        open={state !== null}
        icon={icon}
        tone={tone}
        title={title}
        body={body}
        cancelLabel={cancel}
        confirmLabel={cta}
        busyLabel={busyLabel}
        busy={state === 'busy'}
        done={state === 'done' ? { title: done, actionLabel: 'Continue', onAction: () => setState(null) } : null}
        onConfirm={() => { setState('busy'); setTimeout(() => setState('done'), 1100); }}
        onCancel={() => setState(null)}
      />
    </>
  );
}

export const LogOut: Story = { render: () => <Confirm icon="log-out" tone="action" title="Are you sure you want to log out?" body="You’ll need your OTP to get back in. Your records, orders and bookings stay exactly as they are." cta="Log out" busyLabel="Logging out…" done="You’re logged out" /> };
export const LogOutEverywhere: Story = { render: () => <Confirm icon="end-sessions" tone="danger" title="Log out of every device?" body="Signs out your phone too — including the offline emergency card on it." cta="Log out everywhere" busyLabel="Ending sessions…" done="All sessions ended" /> };
export const CancelBooking: Story = { render: () => <Confirm icon="cancel-booking" tone="danger" title="Cancel this lab booking?" body="Vitamin D + B12, tomorrow 7:00 am. You get ₹649 back to your UPI within 3–5 working days." cancel="Keep booking" cta="Cancel booking" busyLabel="Cancelling…" done="Booking cancelled" /> };
export const StopSharing: Story = { render: () => <Confirm icon="stop-sharing" tone="action" title="Stop sharing with Dr. Menon?" body="He loses access to your CBC report and consult notes right away." cancel="Keep sharing" cta="Stop sharing" busyLabel="Revoking…" done="Access removed" /> };
export const Discard: Story = { render: () => <Confirm icon="discard" tone="action" title="Discard your changes?" body="You edited your emergency card. If you leave now, the offline copy on your phone stays as it was." cancel="Keep editing" cta="Discard" busyLabel="Discarding…" done="Changes discarded" /> };

export const SelectionSheet: Story = {
  render: function SelectionSheet() {
    const [slot, setSlot] = useState(0);
    const slots = [['Tomorrow, 7:00–8:00 AM', 'Block B lobby'], ['Tomorrow, 8:00–9:00 AM', 'Before your first class'], ['Saturday, 7:00–8:00 AM', 'Block B lobby']];
    return (
      <Sheet visible title="Choose a pickup slot" subtitle="Phlebotomist comes to Block B" onClose={noop}>
        {slots.map(([label, meta], i) => <SheetOption key={label} kind="radio" label={label} meta={meta} selected={slot === i} onChange={() => setSlot(i)} />)}
      </Sheet>
    );
  },
};

export const NotificationSheetWithLockedRow: Story = {
  render: () => (
    <Sheet visible title="Notification settings" subtitle="Off by default except safety" onClose={noop}>
      <SheetOption label="Crisis alerts and SOS" meta="Always on" tag="LOCKED" selected locked />
      <SheetOption label="Dose reminders" meta="At your medication times" selected onChange={noop} />
      <SheetOption label="Offers and deals" meta="Never uses your health data" selected={false} onChange={noop} />
    </Sheet>
  ),
};

export const SheetBusy: Story = { render: () => <Sheet visible busy title="Saving preferences" onClose={noop}><p>Nothing closes this until the save settles.</p></Sheet> };

export const CriticalValueDrawer: Story = {
  render: () => (
    <Drawer open dismissible={false} eyebrow="Critical value" eyebrowTone="danger" title="SMP-77412" onClose={noop}>
      <p>Only closes by acting.</p>
    </Drawer>
  ),
};

export const Toasts: Story = {
  render: () => (
    <View style={{ gap: 13, maxWidth: 470 }}>
      <Toast tone="success" title="Order placed" message="SK-48120 · arriving at Block B by 9 PM" action={{ label: 'Track', onPress: noop }} onDone={noop} />
      <Toast tone="error" title="Payment failed" message="Your bank declined the UPI request. Nothing was charged." action={{ label: 'Retry', onPress: noop }} onDismiss={noop} />
      <Toast tone="success" title="Report shared with Dr. Reddy" message="Access expires in 14 days. You can revoke it any time." action={{ label: 'Undo', onPress: noop }} />
      <Toast tone="attention" title="Prescription needs review" message="A pharmacist is checking it. We’ll notify you within 30 minutes." />
      <Toast tone="info" title="Saved offline" message="Your emergency card works without a network." />
    </View>
  ),
};

export const Banners: Story = {
  render: () => (
    <View style={{ gap: 13, maxWidth: 870 }}>
      <Banner tone="attention" title="Consent expired" action={{ label: 'Renew', onPress: noop }}>Dr. Reddy can no longer open your records. Renew if your follow-up is still going.</Banner>
      <Banner tone="info" title="You are offline" action={{ label: 'Dismiss', onPress: noop }}>Your emergency card and saved records still work. Orders will send when you reconnect.</Banner>
      <Banner tone="crisis" title="Crisis support is always open" action={{ label: 'Call', onPress: noop }}>Tele-MANAS 14416 · free, confidential, 24/7 in English, Hindi and Telugu.</Banner>
      <Banner tone="info" title="Erasure request received" action={{ label: 'Track', onPress: noop }}>We must respond within the statutory window. You can track the clock here.</Banner>
    </View>
  ),
};

export const InlineValidation: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 440 }}>
      <FormField label="Campus email address" status="invalid" message="Use your institute email to unlock Edu ID pricing."><input defaultValue="krishna@gmail.com" /></FormField>
      <FormField label="Hostel block" status="valid"><input defaultValue="North Dorm, Block B" /></FormField>
      <FormField label="Room number" hint="As printed on your hostel card"><input /></FormField>
    </div>
  ),
};
