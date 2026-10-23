import React from 'react';
import { AnimatedIcon } from '@/design-system/icons';
import { color } from '@/design-system/theme';

/**
 * The console loader: the animated refresh loop from the animated set
 * (design/icons/animated), in the action colour. Decorative — the state it sits
 * in says "Loading" in words; it rests still under reduced motion.
 */
export function CareLoader() {
  return <span className="care-vector-loader" aria-hidden="true">
    <AnimatedIcon name="anim-refresh" size="mark" color={color.action} />
  </span>;
}
