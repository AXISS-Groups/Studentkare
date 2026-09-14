// React Native entry point (AppRegistry).
//
// Registers the native root so the RN runtime mounts it. Requires the RN deps
// and a Metro/babel config (see src/native/App.tsx). The web entry is
// src/main.tsx → src/App.tsx; this file is native-only.
import { registerRootComponent } from 'expo';
import NativeApp from './App';

registerRootComponent(NativeApp);
