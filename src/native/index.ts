// React Native entry point (AppRegistry).
//
// Registers the native root so the RN runtime mounts it. Requires the RN deps
// and a Metro/babel config (see src/native/App.tsx). The web entry is
// src/main.tsx → src/App.tsx; this file is native-only.
import { registerRootComponent } from 'expo';
// The boot screen reads the account's appearance before it loads ./App (see ./boot).
import NativeBoot from './boot';

registerRootComponent(NativeBoot);
