import catalog from './pdfPosts.json'

export interface PdfPost {
  slug: string
  title: string
  description: string
  date: string
  tags: string[]
  pdf: string
}

export const pdfPosts: PdfPost[] = catalog
