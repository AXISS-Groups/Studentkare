// Metro config for the React Native (native) target.
//
// Vite (web) does NOT use this file. It's consumed only by the Metro bundler
// when running the native app (see src/native/index.ts → src/native/App.tsx).
// The `@` alias mirrors vite.config.ts so native imports resolve the same way.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
};
config.resolver.alias = {
  ...config.resolver.alias,
  '@': `${__dirname}/src`,
};

module.exports = config;
