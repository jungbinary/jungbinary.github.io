import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const blog = defineCollection({
  loader: glob({
    // The glob loader skips cache cleanup and file watching when it finds zero files.
    // Matching the tracked directory marker keeps an empty archive in sync.
    pattern: ['**/[^_]*.md', '.gitkeep'],
    base: './src/content/blog',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    displayDate: z.string(),
    updated: z.string(),
    author: z.string().optional(),
    location: z.string().optional(),
    topics: z.array(z.string()).default([]),
    category: z.enum(['thoughts', 'study-notes']).default('thoughts'),
    hiddenFromIndex: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
})

export const collections = { blog }
