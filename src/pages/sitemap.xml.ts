import type { APIRoute } from 'astro'
import { getListedBlogPosts } from '../data/blog-posts'
import { pdfPosts } from '../data/pdf-posts'

export const GET: APIRoute = async ({ site }) => {
  const posts = await getListedBlogPosts()
  const paths = [
    '/',
    '/blog/',
    ...posts.map((post) => `/blog/${post.id}/`),
    ...pdfPosts.map((post) => `/notes/${post.slug}/`),
  ]
  const urls = paths.map((path) => {
    const href = new URL(path, site).href.replaceAll('&', '&amp;')
    return `  <url><loc>${href}</loc></url>`
  })
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
