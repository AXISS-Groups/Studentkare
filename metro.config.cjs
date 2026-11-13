// Metro config for the React Native (native) target.
//
// Vite (web) does NOT use this file. Expo reads it from the repository root
// when bundling the native app (src/native/index.ts → src/native/App.tsx).
// The `@` alias mirrors vite.config.ts and tsconfig.json (`@/*` → `src/*`).
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const srcRoot = path.join(projectRoot, 'src');

const config = getDefaultConfig(projectRoot);

// A node_modules that is a symlink (a shared install, a monorepo hoist) lives
// outside the project; Metro only resolves files inside its watch folders.
const nodeModules = path.join(projectRoot, 'node_modules');
try {
  const realNodeModules = fs.realpathSync(nodeModules);
  if (realNodeModules !== nodeModules) {
    config.watchFolders = [...(config.watchFolders ?? []), realNodeModules];
    config.resolver.nodeModulesPaths = [...(config.resolver.nodeModulesPaths ?? []), realNodeModules];
  }
} catch {
  // No node_modules yet: Metro reports the missing packages itself.
}

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const target = moduleName.startsWith('@/') ? path.join(srcRoot, moduleName.slice(2)) : moduleName;
  return upstreamResolve
    ? upstreamResolve(context, target, platform)
    : context.resolveRequest(context, target, platform);
};

module.exports = config;
