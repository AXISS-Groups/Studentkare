import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook for the design system (DESIGN.md §4: a component is "real" only
 * when it has stories for every state). It reuses vite.config.ts — the
 * react-native → react-native-web alias and the .web.* extensions — minus the
 * plugin that starts the backend, which stories never call.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  // No usage data leaves a developer's machine.
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    plugins: (viteConfig.plugins ?? []).flat().filter((plugin) => !(plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === 'auto-backend')),
  }),
};

export default config;
