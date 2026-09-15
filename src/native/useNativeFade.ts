import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

/** Content stays visible until the device confirms that motion is permitted. */
export function useNativeFade(): Animated.Value {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const applyPreference = (reduceMotion: boolean) => {
      if (!active) return;
      opacity.stopAnimation();
      opacity.setValue(1);
      if (!reduceMotion) {
        opacity.setValue(0.94);
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true, isInteraction: false }).start();
      }
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduceMotion => {
      preferenceChanged = true;
      applyPreference(reduceMotion);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (!preferenceChanged) applyPreference(reduceMotion);
    }).catch(() => { /* Keep content fully visible if the preference is unavailable. */ });
    return () => {
      active = false;
      subscription.remove();
      opacity.stopAnimation();
    };
  }, [opacity]);
  return opacity;
}
