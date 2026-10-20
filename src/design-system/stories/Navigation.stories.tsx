import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View } from 'react-native';
import { PhoneHeader, TabBar } from '..';
import type { TabBarItem } from '..';

const meta = { title: 'Design system/Phone navigation' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

type Tab = 'discover' | 'wellness' | 'ayush' | 'labTests' | 'yourCare';
const tabs: readonly TabBarItem<Tab>[] = [
  { key: 'discover', label: 'Discover', icon: 'compass' },
  { key: 'wellness', label: 'Wellness', icon: 'map-pin' },
  { key: 'ayush', label: 'Ayush AI', icon: 'sparkle' },
  { key: 'labTests', label: 'Lab Tests', icon: 'flask-2' },
  { key: 'yourCare', label: 'Your Care', icon: 'stethoscope' },
];

export const Headers: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 390 }}>
      <PhoneHeader title="Student Kare" brand actions={[
        { key: 'notifications', icon: 'bell-dome', label: 'Notifications', onPress: noop },
        { key: 'menu', icon: 'menu', label: 'Open menu', onPress: noop, expanded: false },
        { key: 'sos', icon: 'shield-2', label: 'SOS', onPress: noop, tone: 'sos', showLabel: true },
      ]} />
      <PhoneHeader title="Notifications" subtitle="2 unread" back={{ label: 'Back', onPress: noop }} actions={[
        { key: 'menu', icon: 'menu', label: 'Close menu', onPress: noop, expanded: true },
      ]} />
      <PhoneHeader title="Appointments" />
    </View>
  ),
};

function StudentTabs({ initial }: { initial: Tab | null }) {
  const [selected, setSelected] = useState<Tab | null>(initial);
  return <TabBar label="Main sections" items={tabs} selected={selected} onSelect={setSelected} />;
}

export const StudentTabBar: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 390 }}>
      <StudentTabs initial="discover" />
      <StudentTabs initial="yourCare" />
      <StudentTabs initial={null} />
    </View>
  ),
};
