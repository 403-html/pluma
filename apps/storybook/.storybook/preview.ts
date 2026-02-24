/// <reference types="vite/client" />
import '../../app/src/app/globals.css';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from './mocks/handlers';
import type { Preview } from "@storybook/react-vite";

// Module-level initialization is the documented pattern for msw-storybook-addon.
// `initialize` registers the MSW service worker asynchronously; it does not
// block the module and is safe to call at import time.
initialize({ onUnhandledRequest: 'bypass', serviceWorker: { url: '/mockServiceWorker.js' } }, handlers);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [mswLoader],
};

export default preview;
