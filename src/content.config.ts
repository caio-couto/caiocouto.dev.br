import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    summary: z.string(),
    cover: image(),
    categories: z.array(z.string()),
    publishedAt: z.coerce.date(),
    series: z.string().optional(),
    seriesOrder: z.number().int().optional(),
  }),
});

const series = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/series" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    cover: image(),
  }),
});

export const collections = { posts, series };
