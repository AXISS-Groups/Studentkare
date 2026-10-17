/**
 * Style properties react-native-web passes to the DOM that React Native 0.76's
 * own types do not declare. The design system only applies them on web (see
 * `webOnly` in ./theme); declaring them here keeps native type-checking strict
 * without casting.
 */
declare module 'react-native' {
  interface ViewStyle {
    outlineColor?: string;
    outlineStyle?: 'solid' | 'dotted' | 'dashed' | 'none';
    outlineWidth?: number;
    outlineOffset?: number;
    transitionProperty?: string;
    transitionDuration?: string;
    transitionTimingFunction?: string;
  }
}

export {};
