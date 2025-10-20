import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  blog: defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      author: z.string().optional(),
      authorImage: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),
};
