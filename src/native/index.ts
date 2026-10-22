// React Native entry point (AppRegistry).
//
// Registers the native root so the RN runtime mounts it. Requires the RN deps
// and the root metro.config.cjs / babel.config.cjs (see src/native/README.md). The web entry is
// src/main.tsx → src/App.tsx; this file is native-only.
import { registerRootComponent } from 'expo';
import { startCrashReporting } from './crashReporting';
// The boot screen reads the account's appearance before it loads ./App (see ./boot).
import NativeBoot from './boot';

// Crash reporting first, so a crash while booting is caught (off without EXPO_PUBLIC_SENTRY_DSN).
startCrashReporting();
registerRootComponent(NativeBoot);
