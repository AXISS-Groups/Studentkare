// Platform navigation facade — NATIVE implementation.
//
// Hooks for screens inside a mounted React Navigation navigator. This is not
// a replacement for the web Route/Routes API; native mounts its own stack.
//
// Native runtime deps (install once, alongside the app):
//   npm i react-native @react-navigation/native @react-navigation/native-stack \
//       react-native-screens react-native-safe-area-context
import React from 'react';
import { NavigationContainer, useNavigation, useNavigationState } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * Hosts the native navigation container. Feature screens are mounted as
 * children (via a navigator built from the module registry in a full setup).
 */
export function NavigationProvider({ children }: { children?: React.ReactNode }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

/** Current route name, normalized to the same format the web facade returns. */
export function useRoutePath(): string {
  return useNavigationState(state => state.routes[state.index]?.name ?? '');
}

/** Imperative navigation to a route by name. */
export function useNavigate(): (path: string, params?: Record<string, unknown>) => void {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  return (path, params) => {
    navigation.navigate(path, params);
  };
}
