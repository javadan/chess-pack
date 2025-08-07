import fs from 'node:fs'
import readline from 'node:readline'
import { spawn } from 'node:child_process'
import { parse } from 'pgn-parser'

export interface Game {
  headers: Record<string, string>
  moves: string[]
}

export async function *streamPgn(file: string): AsyncIterable<Game> {
  let input: NodeJS.ReadableStream
  if (file.endsWith('.zst')) {
    const proc = spawn('zstdcat', [file])
    input = proc.stdout
  } else {
    input = fs.createReadStream(file, 'utf8')
  }

  const rl = readline.createInterface({ input })
  let buffer = ''
  for await (const line of rl) {
    buffer += line + '\n'
    if (!line.trim()) {
      try {
        const game = parse(buffer)[0]
        if (game) {
          const headers: Record<string, string> = {}
          for (const h of game.headers) headers[h.name] = h.value
          const moves = game.moves.map((m: any) => m.move)
          yield { headers, moves }
          buffer = ''
        }
      } catch {
        // wait for more lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      const game = parse(buffer)[0]
      if (game) {
        const headers: Record<string, string> = {}
        for (const h of game.headers) headers[h.name] = h.value
        const moves = game.moves.map((m: any) => m.move)
        yield { headers, moves }
      }
    } catch {}
  }
}

export default streamPgn

