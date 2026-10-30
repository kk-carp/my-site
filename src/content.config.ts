import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const shared = {
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  isExample: z.boolean().default(false),
};

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({ ...shared, pubDate: z.coerce.date(), author: z.string().default('林安') }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    ...shared,
    order: z.number(),
    cover: z.enum(['notebook-pen', 'panels-top-left', 'map']),
    role: z.string(),
    link: z.url().refine(value => /^https?:\/\//.test(value), '项目链接须为 HTTP(S) 地址').optional(),
  }),
});

export const collections = { blog, projects };
