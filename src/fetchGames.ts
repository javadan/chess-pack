import fs from 'node:fs'
import { Readable } from 'node:stream'

export interface LichessGame {
  id: string
  opening?: { eco: string, name: string }
  [key: string]: any
}

export async function *fetchGames(source: string, maxGames = Infinity): AsyncGenerator<LichessGame> {
  const stream: Readable = source.startsWith('http')
    ? (await fetch(source)).body as any as Readable
    : fs.createReadStream(source, 'utf8')
  let buffer = ''
  let count = 0
  for await (const chunk of stream) {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      yield JSON.parse(line)
      if (++count >= maxGames) return
    }
  }
  if (buffer.trim() && count < maxGames) {
    yield JSON.parse(buffer)
  }
}
