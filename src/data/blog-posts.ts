import { getCollection } from 'astro:content'

export function getListedBlogPosts() {
  return getCollection('blog', ({ data }) => !data.draft && !data.hiddenFromIndex)
}
