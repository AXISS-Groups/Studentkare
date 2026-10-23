import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View } from 'react-native';
import { Button, Checkbox, Chip, RadioGroup, SwitchRow } from '..';

const meta = { title: 'Design system/Controls' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

export const Buttons: Story = {
  render: () => (
    <View style={{ gap: 12, maxWidth: 360 }}>
      <Button label="Primary" onPress={noop} />
      <Button label="Secondary" variant="secondary" onPress={noop} />
      <Button label="Ghost" variant="ghost" onPress={noop} />
      <Button label="Danger" variant="danger" onPress={noop} />
      <Button label="Danger outline" variant="dangerOutline" onPress={noop} />
      <Button label="Busy" busy onPress={noop} />
      <Button label="Disabled" disabled onPress={noop} />
      <Button label="Call to action" size="cta" fullWidth onPress={noop} />
    </View>
  ),
};

export const Checkboxes: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    return (
      <View style={{ gap: 8, maxWidth: 420 }}>
        <Checkbox label="Off" checked={false} onChange={noop} />
        <Checkbox label="On (interactive)" detail="Tap to toggle" checked={on} onChange={setOn} />
        <Checkbox label="Disabled" checked onChange={noop} disabled />
      </View>
    );
  },
};

export const Chips: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Chip label="Off" selected={false} onPress={noop} />
      <Chip label="On" selected onPress={noop} />
      <Chip label="Disabled" selected={false} onPress={noop} disabled />
      <Chip label="App" spokenLabel="App for Orders" selected onPress={noop} />
    </View>
  ),
};

export const SwitchesAndRadios: Story = {
  render: function Render() {
    const [on, setOn] = useState(false);
    const [pick, setPick] = useState<'all' | 'unread'>('all');
    return (
      <View style={{ gap: 16, maxWidth: 420 }}>
        <SwitchRow label="Appointment reminders" detail="Off, on and disabled below" value={on} onChange={setOn} />
        <SwitchRow label="Disabled" value onChange={noop} disabled />
        <RadioGroup label="Show" options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]} value={pick} onChange={setPick} />
      </View>
    );
  },
};
