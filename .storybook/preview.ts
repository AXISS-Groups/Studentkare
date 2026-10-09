import type { Preview } from '@storybook/react-vite';
import '../src/theme/tokens/generated/sk-tokens.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
  },
};

export default preview;
