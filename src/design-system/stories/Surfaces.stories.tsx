import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text, View } from 'react-native';
import {
  Button, Card, CrisisLinks, EmptyState, ErrorState, Eyebrow, ListRow, Note, OfflineBanner, ResultMomentView, Sheet,
  Skeleton, SourceBadge, Stepper, Table, Toast, VerifiedBadge,
} from '..';

const meta = { title: 'Design system/Surfaces and states' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

export const CardsAndRows: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 480 }}>
      <Card><Eyebrow>Default</Eyebrow><Text>Card content</Text></Card>
      <Card selected><Eyebrow>Selected</Eyebrow><Text>Selected card</Text></Card>
      <Card>
        <ListRow title="Plain row" detail="No action" />
        <ListRow title="Row with action" detail="Opens details" value="₹499" onPress={noop} />
        <ListRow title="Selected row" selected onPress={noop} />
      </Card>
    </View>
  ),
};

export const Notes: Story = {
  render: () => (
    <View style={{ gap: 12, maxWidth: 480 }}>
      <Note tone="info" title="Info">Explanatory note.</Note>
      <Note tone="positive" title="Positive">Verified or saved.</Note>
      <Note tone="attention" title="Attention">Outside the lab's range — amber, never red.</Note>
      <Note tone="danger" title="Danger">Not saved. Try again.</Note>
      <OfflineBanner message="You're offline. Showing what was saved on this device." />
    </View>
  ),
};

export const Toasts: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Toast message="Request sent" />
      <Toast message="Saved" tone="success" />
      <Toast message="That didn't go through. Nothing was charged — try again. This message wraps on a phone." tone="error" />
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={{ gap: 24, maxWidth: 480 }}>
      <Skeleton label="Loading" lines={['60%', '100%', '84%']} />
      <EmptyState title="No records yet" body="Documents you upload appear here." action={{ label: 'Upload a document', onPress: noop }} />
      <ErrorState title="Couldn't load" body="This is on our side, not yours. Try again." retryLabel="Try again" onRetry={noop} reference={{ label: 'Reference', code: 'SK-7F2A' }} />
      <Stepper current={2} total={4} label="Step 2 of 4" />
    </View>
  ),
};

export const ResultMoments: Story = {
  render: () => (
    <View style={{ gap: 24, maxWidth: 480 }}>
      <ResultMomentView moment={{ kind: 'success', context: 'booking' }} title="Booked" body="Your slot is reserved. (Success is for commerce and bookings only.)" />
      <ResultMomentView moment={{ kind: 'pending' }} title="Waiting for the provider" body="Not confirmed until they accept." />
      <ResultMomentView moment={{ kind: 'failure' }} title="Payment failed" body="Nothing was charged." />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <VerifiedBadge serverStatus="VERIFIED" label="Campus verified" />
        <SourceBadge source="typed-by-you" />
        <SourceBadge source="device" />
      </View>
    </View>
  ),
};

export const Tables: Story = {
  render: () => {
    const columns = [
      { key: 'name', header: 'Item', render: (r: { id: string; name: string; price: string }) => r.name, flex: 2 },
      { key: 'price', header: 'Price', render: (r: { id: string; name: string; price: string }) => r.price, mono: true },
    ];
    const rows = [{ id: '1', name: 'Paracetamol 650', price: '₹32' }, { id: '2', name: 'CBC test', price: '₹299' }];
    return (
      <View style={{ gap: 24 }}>
        <Table caption="Data" columns={columns} rows={rows} rowKey={(r) => r.id} empty={{ title: 'None', body: '' }} actions={() => <Button label="Edit" variant="secondary" onPress={noop} />} />
        <Table caption="Loading" columns={columns} rows={null} loading rowKey={(r) => r.id} empty={{ title: 'None', body: '' }} />
        <Table caption="Empty" columns={columns} rows={[]} rowKey={(r) => r.id} empty={{ title: 'No orders yet', body: 'Orders you receive appear here.' }} />
        <Table caption="Error" columns={columns} rows={null} rowKey={(r) => r.id} error={{ title: "Couldn't load orders", body: 'Try again.', onRetry: noop }} empty={{ title: 'None', body: '' }} />
      </View>
    );
  },
};

export const Sheets: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    return (
      <View style={{ gap: 12, maxWidth: 360 }}>
        <Button label="Open sheet" onPress={() => setOpen(true)} />
        <Sheet visible={open} title="Cancel this booking?" busy={busy} onClose={() => setOpen(false)}>
          <Text>Your slot is released for someone else.</Text>
          <Button label={busy ? 'Cancelling' : 'Cancel booking'} variant="danger" busy={busy} onPress={() => setBusy(true)} />
        </Sheet>
      </View>
    );
  },
};

export const Crisis: Story = { render: () => <View style={{ maxWidth: 480 }}><CrisisLinks /></View> };
