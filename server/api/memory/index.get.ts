import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const workspacePath = config.workspacePath
  const query = getQuery(event)
  const search = (query.q as string || '').toLowerCase()

  const files: Array<{
    path: string
    name: string
    type: 'daily' | 'memory' | 'plan' | 'other'
    size: number
    modifiedAt: string
    preview: string
    content?: string
  }> = []

  function scanDir(dir: string) {
    if (!existsSync(dir)) return

    for (const file of readdirSync(dir)) {
      const fullPath = join(dir, file)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && file === 'memory') {
        scanDir(fullPath)
        continue
      }

      if (!stat.isFile() || extname(file) !== '.md') continue

      const content = readFileSync(fullPath, 'utf-8')
      const preview = content.slice(0, 200).replace(/\n/g, ' ')

      if (search && !content.toLowerCase().includes(search)) continue

      const name = basename(file, '.md')
      const type = /^\d{4}-\d{2}-\d{2}$/.test(name)
        ? 'daily'
        : name === 'MEMORY'
          ? 'memory'
          : name.includes('plan')
            ? 'plan'
            : 'other'

      files.push({
        path: fullPath.replace(workspacePath + '/', ''),
        name,
        type,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        preview,
        ...(query.content === 'true' ? { content } : {})
      })
    }
  }

  // Scan workspace root for MEMORY.md
  if (existsSync(join(workspacePath, 'MEMORY.md'))) {
    const content = readFileSync(join(workspacePath, 'MEMORY.md'), 'utf-8')
    if (!search || content.toLowerCase().includes(search)) {
      files.push({
        path: 'MEMORY.md',
        name: 'MEMORY',
        type: 'memory',
        size: statSync(join(workspacePath, 'MEMORY.md')).size,
        modifiedAt: statSync(join(workspacePath, 'MEMORY.md')).mtime.toISOString(),
        preview: content.slice(0, 200).replace(/\n/g, ' '),
        ...(query.content === 'true' ? { content } : {})
      })
    }
  }

  // Scan memory/ directory
  scanDir(join(workspacePath, 'memory'))

  // Sort: MEMORY.md first, then by date desc
  files.sort((a, b) => {
    if (a.type === 'memory') return -1
    if (b.type === 'memory') return 1
    return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  })

  return files
})
