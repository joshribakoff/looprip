import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // You can set `site` later when deploying, helps with sitemaps and canonical URLs
  integrations: [
    starlight({
      title: 'Agent Thing Docs',
      sidebar: [
        { label: 'Intro', slug: 'intro' },
        { label: 'Concepts', slug: 'concepts' },
        { label: 'Examples', autogenerate: { directory: 'examples2' } },
        { label: 'Blog', link: '/blog' },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/joshribakoff/agent-thing' },
      ],
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
      },
    }),
  ],
});
