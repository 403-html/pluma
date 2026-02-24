/// <reference types="vite/client" />
import '../../app/src/app/globals.css';
import type { Preview } from "@storybook/react-vite";

// Silently absorb any /api/* or /sdk/* fetch calls so stories that render
// components with server dependencies don't produce console 404 errors.
// Stories should provide data directly via component props instead.
if (typeof window !== 'undefined') {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input
      : input instanceof URL ? input.href
      : (input as Request).url;
    if (url.startsWith('/api/') || url.startsWith('/sdk/')) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }
    return realFetch(input, init);
  };
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
