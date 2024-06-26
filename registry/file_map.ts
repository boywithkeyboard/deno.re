import { ensureDir } from 'fs-extra'
import { readFile, writeFile } from 'node:fs/promises'
import { deadline } from './deadline'
import { compress, decompress } from './gzip'
import { s3 } from './s3'
import { unzip } from './unzip'
import { validExt } from './valid_ext'

const sha1Pattern = /^[0-9a-f]{40}$/

export type FileMap = Record<string, string>

export async function createFileMap(user: string, repo: string, tag: string): Promise<FileMap | null> {
  const res = await fetch(
    'https://github.com/' + user + '/' + repo + (
      sha1Pattern.test(tag) ? '/archive/' : '/archive/refs/tags/'
    ) + tag + '.zip'
  )

  if (!res.ok) {
    await res.body?.cancel()

    return null
  }

  const buf = await deadline(res.arrayBuffer(), 2500)

  if (buf.byteLength > 10_000_000) { // 10 MB
    return null
  }

  const map: FileMap = {}

  const files = await deadline(unzip(buf), 2500)
 
  for (const key in files) {
    if (!validExt(key) || files[key].byteLength < 1) {
      continue
    }

    map[key.substring(key.indexOf('/'))] = Buffer.from(files[key]).toString('base64')
  }

  return map
}

export async function getFileMap(user: string, repo: string, tag: string): Promise<{
  fileMap: FileMap | null
  resolve?: Promise<unknown>
}> {
  await ensureDir('./cache')

  const mapName = user + '/' + repo + '/' + tag
  const encodedMapName = Buffer.from(mapName).toString('hex')
  let str

  try {
    // check if file map is in local cache
    str = await readFile('./cache/' + encodedMapName, 'utf-8')

    return {
      fileMap: JSON.parse(str)
    }
  } catch (err) {
    // check if file map is in remote cache
    const res = await fetch(`https://${process.env.S3_HOSTNAME}/${mapName}`)

    if (res.ok) {
      const buf = await decompress(
        await res.arrayBuffer()
      )

      await writeFile('./cache/' + encodedMapName, buf)

      return {
        fileMap: JSON.parse(buf.toString('utf-8'))
      }
    } else {
      await res.body?.cancel()
    }

    // generate file map
    const fileMap = await createFileMap(user, repo, tag)

    if (!fileMap) {
      return {
        fileMap: null
      }
    }

    return {
      fileMap,
      resolve: Promise.all([
        writeFile('./cache/' + encodedMapName, JSON.stringify(fileMap)),
        s3.putObject({
          Bucket: process.env.S3_BUCKET,
          Key: mapName,
          Body: await compress(JSON.stringify(fileMap))
        })
      ])
    }
  }
}
