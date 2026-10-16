import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View } from 'react-native';
import { CodeInput, PhoneInput, Select, TextField } from '..';

const meta = { title: 'Design system/Inputs' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

export const TextFields: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 420 }}>
      <TextField label="Empty" value="" onChangeText={noop} placeholder="Your city" />
      <TextField label="Filled" value="Hyderabad" onChangeText={noop} hint="Where you live now" />
      <TextField label="Invalid" value="12" onChangeText={noop} error="Enter a 6-digit pincode." mono />
      <TextField label="Disabled" value="Locked" onChangeText={noop} disabled />
    </View>
  ),
};

export const Codes: Story = {
  render: function Render() {
    const [code, setCode] = useState('');
    return (
      <View style={{ gap: 16, maxWidth: 420 }}>
        <CodeInput label="Empty (interactive)" value={code} onChangeText={setCode} hint="6 digits" />
        <CodeInput label="Filled" value="482913" onChangeText={noop} />
        <CodeInput label="Invalid" value="4829" onChangeText={noop} error="That code has expired. Send a new one." />
        <CodeInput label="Disabled" value="" onChangeText={noop} disabled />
      </View>
    );
  },
};

export const Phones: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 420 }}>
      <PhoneInput label="Empty" value="" onChangeText={noop} />
      <PhoneInput label="Filled" value="9876543210" onChangeText={noop} />
      <PhoneInput label="Invalid" value="98765" onChangeText={noop} error="Enter all 10 digits." />
      <PhoneInput label="Disabled" value="9876543210" onChangeText={noop} disabled />
    </View>
  ),
};

export const Selects: Story = {
  render: function Render() {
    const [value, setValue] = useState<'OTC' | 'H' | null>(null);
    const options = [{ value: 'OTC' as const, label: 'OTC' }, { value: 'H' as const, label: 'Schedule H' }];
    return (
      <View style={{ gap: 16, maxWidth: 420 }}>
        <Select label="Empty (interactive)" options={options} value={value} onChange={setValue} />
        <Select label="Filled" options={options} value="H" onChange={noop} />
        <Select label="Invalid" options={options} value={null} onChange={noop} error="Choose a schedule." />
        <Select label="Disabled" options={options} value="OTC" onChange={noop} disabled />
      </View>
    );
  },
};
