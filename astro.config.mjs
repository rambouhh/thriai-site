import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  site: 'https://thriai.io',
  integrations: [sitemap()],
});
