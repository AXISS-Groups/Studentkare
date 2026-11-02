import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SkIconName } from '../icons';
import { Rise } from '../motion';
import { color, focusRing, motion, radius, size, space, webOnly } from '../theme';
import { GradientHeroCard } from './GradientHeroCard';
import { useAutoAdvance, useOnScreen } from './m2Motion';
import { webAttrs, webHandlers } from './M2Parts';
import type { PressState } from './M2Parts';
import { useM2Layout } from './m2Layout';

/**
 * The Mobile 2.0 highlights carousel (M2Home): one gradient hero card at a
 * time, the dots under it. It moves on by itself every
 * `motion.duration.carousel` while motion is allowed and it is on screen; it
 * holds while hovered or focused, and stops for good once the student picks a
 * dot (WCAG 2.2.2). Each card rises in as it arrives (skipped when reduced).
 *
 * On a desktop (inside `<M2Responsive>`) two cards show side by side: the
 * current one and the next, wrapping round; the dots still move one at a time.
 */
export interface HeroSlide {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  icon: SkIconName;
  stops: readonly string[];
  chipFill: string;
  ink: string;
  onPress: () => void;
}

export interface HeroCarouselProps {
  /** Accessible name of the carousel. */
  label: string;
  slides: readonly HeroSlide[];
  /** "Show highlight {n}" for dot n (1-based). */
  dotLabel: (n: number) => string;
  testID?: string;
}

export function HeroCarousel({ label, slides, dotLabel, testID = 'hero-carousel' }: HeroCarouselProps) {
  const [node, setNode] = useState<unknown>(null);
  const onScreen = useOnScreen(node);
  const { index, pick, hold } = useAutoAdvance(slides.length, onScreen);
  const slide = slides[index];
  const pair = useM2Layout() === 'desktop' && slides.length > 1;
  if (!slide) return null;
  const shown = pair ? [slide, slides[(index + 1) % slides.length]] : [slide];
  return (
    <View
      ref={(n: unknown) => setNode(n)}
      testID={testID}
      accessibilityLabel={label}
      aria-label={label}
      {...webAttrs({ 'aria-roledescription': 'carousel' })}
      onPointerEnter={() => hold(true)}
      onPointerLeave={() => hold(false)}
      {...webHandlers({ onFocus: () => hold(true), onBlur: () => hold(false) })}
      style={styles.wrap}
    >
      <View style={pair ? styles.pair : null}>
        {shown.map((s) => (
          <Rise key={s.key} style={pair ? styles.pairCell : undefined}>
            <GradientHeroCard
              testID={`${testID}-slide-${s.key}`}
              stops={s.stops}
              chipFill={s.chipFill}
              eyebrow={s.eyebrow}
              title={s.title}
              body={s.body}
              cta={{ label: s.cta, ink: s.ink }}
              icon={s.icon}
              onPress={s.onPress}
              label={`${s.title}. ${s.cta}`}
            />
          </Rise>
        ))}
      </View>
      <View style={styles.dots}>
        {slides.map((s, i) => (
          <Pressable
            key={s.key}
            role="button"
            accessibilityRole="button"
            accessibilityLabel={dotLabel(i + 1)}
            aria-label={dotLabel(i + 1)}
            aria-pressed={i === index}
            accessibilityState={{ selected: i === index }}
            onPress={() => pick(i)}
            testID={`${testID}-dot-${i + 1}`}
            style={({ focused }: PressState) => [styles.dotHit, focused ? focusRing : null]}
          >
            <View style={[styles.dot, i === index ? styles.dotOn : null]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s4 },
  pair: { flexDirection: 'row', gap: space.s16 },
  pairCell: { flex: 1, minWidth: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dotHit: { minWidth: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  dot: {
    width: space.s8, height: space.s8, borderRadius: radius.full, backgroundColor: color.ruleStrong,
    ...webOnly({ transitionProperty: 'width', transitionDuration: `${motion.duration.base}ms`, transitionTimingFunction: motion.easing.standard }),
  },
  dotOn: { width: space.s24, backgroundColor: color.action },
});
