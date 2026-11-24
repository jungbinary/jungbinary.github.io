import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return posts.some(post => post.id === 'isba-2026')
    ? [{ params: { alias: 'isba2026' } }]
    : []
}

export const GET: APIRoute = () => new Response(
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/blog/isba-2026/"><link rel="canonical" href="https://jungbinary.github.io/blog/isba-2026/"><title>ISBA 2026</title><a href="/blog/isba-2026/">ISBA 2026</a></html>',
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
)
