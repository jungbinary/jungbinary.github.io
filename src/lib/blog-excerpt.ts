import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5'

type Element = DefaultTreeAdapterTypes.Element
type Child = DefaultTreeAdapterTypes.ChildNode
const sentences = new Intl.Segmenter('en', { granularity: 'sentence' })
const skippedTags = new Set([
  'script', 'style', 'template', 'figure', 'pre', 'table', 'nav', 'svg',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'annotation', 'annotation-xml',
])
const skippedClasses = new Set(['academic-heading', 'katex-display', 'math-display', 'blog-references', 'footnotes'])

function skip(element: Element) {
  return skippedTags.has(element.tagName) || element.attrs.some(({ name, value }) =>
    name === 'hidden' || (name === 'aria-hidden' && value === 'true') ||
    (name === 'class' && value.split(/\s+/).some((word) => skippedClasses.has(word))) ||
    (name === 'display' && ['block', 'true'].includes(value)),
  )
}

function paragraphText(node: Child, includeMath = true): string {
  if ('value' in node) return node.value
  if (!('tagName' in node) || skip(node)) return ''
  if (node.tagName === 'math' && !includeMath) return ''
  if (node.tagName === 'br') return ' '
  // Read the presentation MathML once, with its scripts and fractions intact.
  const children = node.namespaceURI === 'http://www.w3.org/1998/Math/MathML'
    ? node.childNodes.filter((child) => !('value' in child && !child.value.trim()))
    : node.childNodes
  const parts = children.map((child) => paragraphText(child, includeMath))
  switch (node.tagName) {
    case 'msup': return parts.join('^')
    case 'msub': return parts.join('_')
    case 'msubsup': return parts.length === 3 ? `${parts[0]}_${parts[1]}^${parts[2]}` : parts.join('')
    case 'mfrac': return parts.length === 2 ? `(${parts[0]})/(${parts[1]})` : parts.join('')
    case 'msqrt': return `√(${parts.join('')})`
    default: return parts.join('')
  }
}

function firstParagraph(children: Child[]): string {
  for (const node of children) {
    if (!('tagName' in node) || skip(node)) continue
    if (node.tagName === 'p') {
      if (!/\p{L}/u.test(paragraphText(node, false))) continue
      const text = paragraphText(node).replace(/\s+/g, ' ').trim()
      if (!/^(?:\$\$[\s\S]*\$\$|\\\[[\s\S]*\\\])$/.test(text)) return text
    } else {
      const text = firstParagraph(node.childNodes)
      if (text) return text
    }
  }
  return ''
}

export function blogExcerpt(html: string | undefined, description: string): string {
  const prose = html ? firstParagraph(parseFragment(html).childNodes) : ''
  const text = prose || description.trim()
  return sentences.segment(text).containing(0)?.segment.trim() ?? ''
}
