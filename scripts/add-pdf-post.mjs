import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const postsPath = resolve(projectRoot, 'src/data/pdfPosts.json')
const robotsPath = resolve(projectRoot, 'public/robots.txt')
const notesDirectory = resolve(projectRoot, 'public/notes')

const args = process.argv.slice(2)
const usage =
  'npm run add:pdf -- /path/to/file.pdf --slug my-note --title "My Note" --date YYYY-MM-DD --tags "Tag One,Tag Two"'

if (args.includes('--help')) {
  console.log(`Usage: ${usage}`)
  process.exit(0)
}

const sourceArg = args[0]?.startsWith('--') ? undefined : args[0]

const getOption = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const fail = (message) => {
  console.error(`\nError: ${message}\n`)
  console.error(`Usage: ${usage}`)
  process.exit(1)
}

if (!sourceArg) fail('PDF path is required.')

const source = resolve(sourceArg)
const slug = getOption('slug')
const title = getOption('title')
const date = getOption('date') ?? new Date().toISOString().slice(0, 10)
const tags = (getOption('tags') ?? '')
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean)

if (!existsSync(source)) fail(`File not found: ${source}`)
if (extname(source).toLowerCase() !== '.pdf') fail('The source must be a PDF.')
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  fail('A lowercase kebab-case --slug is required.')
}
if (!title) fail('--title is required.')
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('--date must use YYYY-MM-DD.')
if (tags.length === 0) fail('At least one comma-separated --tags value is required.')

const signature = readFileSync(source).subarray(0, 5).toString()
if (signature !== '%PDF-') fail('The source does not appear to be a valid PDF.')

const posts = JSON.parse(readFileSync(postsPath, 'utf8'))
if (posts.some((post) => post.slug === slug)) {
  fail(`A PDF post with slug "${slug}" already exists.`)
}

const outputName = `${slug}.pdf`
const outputPath = resolve(notesDirectory, outputName)
if (existsSync(outputPath)) fail(`Output already exists: ${outputPath}`)

mkdirSync(notesDirectory, { recursive: true })
copyFileSync(source, outputPath)

posts.push({
  slug,
  title,
  description: `${title}.`,
  date,
  tags,
  pdf: `/notes/${outputName}`,
})
posts.sort((a, b) => b.date.localeCompare(a.date))
writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`)

const robotsRule = `Disallow: /notes/${outputName}`
const robots = readFileSync(robotsPath, 'utf8').trimEnd()
if (!robots.includes(robotsRule)) {
  writeFileSync(robotsPath, `${robots}\n${robotsRule}\n`)
}

try {
  execFileSync('npm', ['run', 'check'], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
} catch {
  fail(
    `The post was added, but validation failed. Review ${basename(postsPath)} and retry npm run check.`,
  )
}

console.log(`\nAdded ${title}`)
console.log(`Page: /notes/${slug}/`)
console.log(`PDF:  /notes/${outputName}`)
