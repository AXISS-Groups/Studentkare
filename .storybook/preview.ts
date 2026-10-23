import type { Preview } from '@storybook/react-vite';
import '../src/theme/tokens/generated/sk-tokens.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
  },
  // Toolbar switch: every story can be checked in light and dark (DESIGN.md D3).
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      document.documentElement.setAttribute('data-theme', String(context.globals.theme ?? 'light'));
      return Story();
    },
  ],
};

export default preview;
