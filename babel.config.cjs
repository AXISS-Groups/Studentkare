// Babel config for the React Native (native) target.
//
// Vite (web) uses esbuild and does NOT read this file. It's used only by Metro
// when bundling the native app. `@` resolves the shared source (the stores and
// ViewModels that are platform-agnostic).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: { '@': './src' },
        },
      ],
    ],
  };
};
