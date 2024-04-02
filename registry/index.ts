import fastify, { type FastifyReply } from 'fastify'
import { filePathToContentType } from './content_type'
import { getFileMap } from './file_map'
import { getEntryPoint } from './get_entry_point'
import { getLatestTag } from './get_latest_tag'
import { hash } from './hash'
import { resolveTypeHeader } from './resolve_type_header'
import { validExt } from './valid_ext'
import html from '../build/index.html'
import favicon from '../build/favicon.svg'

const app = fastify()

app.get('/', (_, res) => {
  res.header('Cache-Control', 's-max-age=1800, max-age=300')
  res.header('Content-Type', 'text/html; charset=utf-8')

  return html
})

app.get('/favicon.svg', (_, res) => {
  res.header('Cache-Control', 's-max-age=86400, max-age=3600')
  res.header('Content-Type', 'image/svg+xml; charset=utf-8')

  return favicon
})

app.get('/ready', () => 'READY')

function respondWith(res: FastifyReply, statusCode: number, body: string | Buffer | null, headers?: Record<string, string>) {
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.header(key, value)
    }
  }

  res.code(statusCode)
  
  if (body !== null) {
    res.send(body)
  }
}

app.setNotFoundHandler(async (req, res) => {
  try {
    if (req.method.toUpperCase() !== 'GET') {
      return respondWith(res, 404, 'BAD METHOD')
    }

    const url = req.url

    if (
      /^\/([a-zA-Z0-9\-]+)\/([a-zA-Z0-9._\-]+)(@[a-zA-Z0-9.*]+)?(\/([a-zA-Z0-9._\-]+))*$/.test(url) === false
    ) {
      return respondWith(res, 404, 'BAD URL', {
        'Cache-Control': 's-max-age=60, max-age=0'
      })
    }

    const arr = url.split('/')

    const user = arr[1]
    const repo = arr[2].split('@')[0]
    let tag = arr[2].split('@')[1]

    if (!tag) {
      const latestTag = await getLatestTag(user, repo)

      if (!latestTag) {
        return respondWith(res, 404, 'REPOSITORY NOT FOUND', {
          'Cache-Control': 's-max-age=60, max-age=0'
        })
      }

      arr[2] = arr[2] + '@' + latestTag

      return respondWith(res, 307, null, {
        Location: 'https://deno.re' + arr.join('/')
      })
    }

    const fileMap = await getFileMap(user, repo, tag)

    if (!fileMap) {
      return respondWith(res, 500, 'REPOSITORY OR TAG NOT FOUND', {
        'Cache-Control': 's-max-age=60, max-age=0'
      })
    }

    let path = '/' + url.split('/').slice(3).join('/')
    const previousEtag = req.headers['if-none-match']

    const entryPoint = !validExt(path)
      ? getEntryPoint(fileMap, path)
      : path

    if (!entryPoint) {
      return respondWith(res, 404, 'ENTRY POINT NOT FOUND', {
        'Cache-Control': 's-max-age=60, max-age=0'
      })
    }

    let content = fileMap[entryPoint]

    if (!content) {
      return respondWith(res, 404, 'FILE NOT FOUND', {
        'Cache-Control': 's-max-age=60, max-age=0'
      })
    }

    let contentType = filePathToContentType(entryPoint)
  
    if (validExt(path)) {
      content = Buffer.from(content, 'base64').toString('utf-8')
    } else {
      contentType = filePathToContentType('.ts')
      content = `export * from 'https://deno.re/${user}/${repo}@${tag}${entryPoint}'`
    }

    const checksum = `"${hash(content)}"`
    const typeHeader = resolveTypeHeader(fileMap, entryPoint)

    if (previousEtag === checksum) {
      return respondWith(res, 304, null, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=2592000, immutable', // a month
        'Content-Type': contentType + '; charset=utf-8',
        'ETag': checksum,
        ...(typeHeader && { 'X-TypeScript-Types': 'https://deno.re/' + user + '/' + repo + '@' + tag + typeHeader })
      })
    }

    respondWith(res, 200, content, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=2592000, immutable', // a month
      'Content-Type': contentType + '; charset=utf-8',
      'ETag': checksum,
      ...(typeHeader && { 'X-TypeScript-Types': 'https://deno.re/' + user + '/' + repo + '@' + tag + typeHeader })
    })
  } catch (err) {
    console.error(err)

    respondWith(res, 500, 'SOMETHING WENT WRONG', {
      'Cache-Control': 's-max-age=60, max-age=0'
    })
  }
})

const start = async () => {
  try {
    await app.listen({
      host: '0.0.0.0',
      port: parseInt(process.env.PORT ?? '3000')
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}
start()
