declare module 'react-native' {
  import * as React from 'react';

  export interface ViewStyle {
    [key: string]: any;
  }
  export interface TextStyle {
    [key: string]: any;
  }
  export interface ImageStyle {
    [key: string]: any;
  }
  /** A style, an array of styles, or nothing (falsy entries are skipped). */
  export type StyleProp<T> = T | readonly StyleProp<T>[] | false | null | undefined;

  export interface TouchableOpacityProps extends React.AriaAttributes {
    dataSet?: Record<string, string | number | boolean | null | undefined>;
    onPress?: (event?: any) => void;
    activeOpacity?: number;
    style?: any;
    disabled?: boolean;
    children?: React.ReactNode;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    ariaLabel?: string;
    role?: string;
  }

  export const View: React.FC<any>;
  export const Text: React.FC<any>;
  export const TouchableOpacity: React.FC<TouchableOpacityProps>;
  export const ScrollView: React.FC<any>;
  export const TextInput: React.FC<any>;
  export const Switch: React.FC<any>;
  export const Image: React.FC<any>;
  export const Modal: React.FC<any>;
  export const ActivityIndicator: React.FC<any>;

  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
    flatten: (style: any) => any;
    absoluteFill: object;
    absoluteFillObject: { position: 'absolute'; left: 0; right: 0; top: 0; bottom: 0 };
  };

  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number; scale: number; fontScale: number };
    addEventListener: (type: string, handler: Function) => { remove: () => void };
  };
  // The window size, kept current (react-native-web implements it); the M2 layout's first guess.
  export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number };
  // What a View's onLayout receives (its measured box).
  export interface LayoutChangeEvent { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }

  // Narrow declarations for the APIs src/design-system uses (motion, press state).
  export type EasingFunction = (value: number) => number;
  export const Easing: {
    linear: EasingFunction;
    ease: EasingFunction;
    bezier: (x1: number, y1: number, x2: number, y2: number) => EasingFunction;
    inOut: (easing: EasingFunction) => EasingFunction;
    out: (easing: EasingFunction) => EasingFunction;
    cubic: EasingFunction;
  };

  interface AnimatedInterpolation {
    __interpolation: true;
  }
  interface AnimatedValue {
    setValue: (value: number) => void;
    stopAnimation: () => void;
    interpolate: (config: { inputRange: number[]; outputRange: number[] | string[] }) => AnimatedInterpolation;
  }
  interface AnimatedComposite {
    start: () => void;
    stop: () => void;
  }
  export const Animated: {
    Value: new (value: number) => AnimatedValue;
    View: React.FC<{
      style?: unknown;
      children?: React.ReactNode;
      testID?: string;
      pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
      accessibilityElementsHidden?: boolean;
      importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
    }>;
    multiply: (a: AnimatedValue | number, b: AnimatedValue | number) => AnimatedInterpolation;
    timing: (
      value: AnimatedValue,
      config: { toValue: number; duration: number; delay?: number; easing?: EasingFunction; useNativeDriver: boolean; isInteraction?: boolean },
    ) => AnimatedComposite;
    delay: (time: number) => AnimatedComposite;
    sequence: (animations: AnimatedComposite[]) => AnimatedComposite;
    loop: (animation: AnimatedComposite) => AnimatedComposite;
  };
  export namespace Animated {
    type Value = AnimatedValue;
  }

  export const Linking: {
    openURL: (url: string) => Promise<void>;
  };

  export const AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise<boolean>;
    addEventListener: (event: 'reduceMotionChanged', handler: (enabled: boolean) => void) => { remove: () => void };
  };

  export const Keyboard: {
    addListener: (
      event: 'keyboardWillShow' | 'keyboardWillHide' | 'keyboardDidShow' | 'keyboardDidHide',
      handler: () => void,
    ) => { remove: () => void };
  };

  export interface PressableState {
    pressed: boolean;
    hovered?: boolean;
    focused?: boolean;
  }
  export const Pressable: React.FC<
    React.AriaAttributes & {
      onPress?: () => void;
      disabled?: boolean;
      style?: object | ((state: PressableState) => object);
      children?: React.ReactNode;
      testID?: string;
      accessibilityRole?: string;
      accessibilityLabel?: string;
      accessibilityState?: { disabled?: boolean; busy?: boolean; checked?: boolean; selected?: boolean; expanded?: boolean };
      focusable?: boolean;
      role?: string;
    }
  >;

  export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
  export const AppState: {
    currentState: AppStateStatus | null;
    addEventListener: (event: 'change', handler: (state: AppStateStatus) => void) => { remove: () => void };
  };

  export const Appearance: {
    getColorScheme: () => 'light' | 'dark' | null | undefined;
    /** React Native 0.72+ on iOS/Android; react-native-web does not implement it. */
    setColorScheme?: (scheme: 'light' | 'dark' | null | undefined) => void;
  };

  export const Platform: {
    OS: 'web' | 'ios' | 'android';
    select: <T>(specifics: { ios?: T; android?: T; web?: T; default?: T }) => T;
  };
}

declare module 'react-native-web' {
  export * from 'react-native';
}
