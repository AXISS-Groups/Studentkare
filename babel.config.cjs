// Babel config for the React Native (native) target.
//
// Expo/Metro read this from the repository root. Vite (web) uses esbuild and
// @vitejs/plugin-react with `configFile: false`, so the web build ignores it.
// The `@` alias is resolved by metro.config.cjs (resolveRequest), the same
// mapping as vite.config.ts and tsconfig.json.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
