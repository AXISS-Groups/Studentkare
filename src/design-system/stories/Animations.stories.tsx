import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text, View } from 'react-native';
import { AnimatedIcon, AnimatedIllustration } from '../icons';
import type { SkAnimatedName, TileHue } from '../icons';
import { skAnimated } from '../icons/generated/skAnimatedData';
import { EmptyState, StateScreen } from '..';
import { color, font } from '../theme';

/**
 * Every animation in the set (design/icons/animated/README.md), flat and 3D. Use the Theme switch in
 * the toolbar for dark; turn on "reduce motion" in the OS to see the still frames.
 */
const meta = { title: 'Design system/Animations' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const names = Object.keys(skAnimated) as SkAnimatedName[];
const icons = names.filter((n) => skAnimated[n].kind === 'icon');
const art = names.filter((n) => skAnimated[n].kind !== 'icon');
const HUES: readonly TileHue[] = ['indigo', 'violet', 'blue', 'sky', 'teal', 'green', 'amber', 'orange', 'rose'];
const noop = () => undefined;

const caption = { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text2 };
const cell = { width: 120, alignItems: 'center' as const, gap: 6, paddingVertical: 10 };
const grid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, backgroundColor: color.canvas, padding: 12 };

export const Icons2D: Story = {
  render: () => (
    <View style={grid}>
      {icons.map((n) => (
        <View key={n} style={cell}>
          <AnimatedIcon name={n} size="mark" play={skAnimated[n].loop ? 'loop' : 'hover'} />
          <Text style={caption}>{n}</Text>
        </View>
      ))}
    </View>
  ),
};

export const Icons3D: Story = {
  render: () => (
    <View style={grid}>
      {icons.map((n, i) => (
        <View key={n} style={cell}>
          <AnimatedIcon name={n} variant="3d" hue={HUES[i % HUES.length]} play={skAnimated[n].loop ? 'loop' : 'hover'} />
          <Text style={caption}>{n}</Text>
        </View>
      ))}
    </View>
  ),
};

export const ScenesAndChartLoops: Story = {
  render: () => (
    <View style={grid}>
      {art.map((n) => (
        <View key={n} style={{ alignItems: 'center', gap: 6, padding: 8 }}>
          <AnimatedIllustration name={n} size="md" />
          <Text style={caption}>{n}</Text>
        </View>
      ))}
    </View>
  ),
};

export const InStates: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 420 }}>
      <StateScreen kind="success" title="Shared with Dr Rao" body="Until 30 Oct." primary={{ label: 'Done', onPress: noop }} />
      <StateScreen kind="offline" chip="Offline" title="You're offline" body="Saved records still open." primary={{ label: 'Try again', onPress: noop }} />
      <EmptyState title="No notifications yet" body="Reminders and updates appear here." animation="anim-bell-off" />
      <EmptyState title="No lab packages listed yet" body="Check back soon." animation="scene-lab-workers" />
    </View>
  ),
};
