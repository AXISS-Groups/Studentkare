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

  export interface TouchableOpacityProps {
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
  };

  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number; scale: number; fontScale: number };
    addEventListener: (type: string, handler: Function) => { remove: () => void };
  };

  export const Platform: {
    OS: 'web' | 'ios' | 'android';
    select: <T>(specifics: { ios?: T; android?: T; web?: T; default?: T }) => T;
  };
}

declare module 'react-native-web' {
  export * from 'react-native';
}
