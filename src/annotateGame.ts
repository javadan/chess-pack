import { Chess } from 'chess.js'
import { createHash } from 'node:crypto'
import type Piscina from 'piscina'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { Game } from './streamPgn.js'

export type Engine =
  | { type: 'wasm'; pool: Piscina }
  | { type: 'native'; proc: ChildProcessWithoutNullStreams }

async function evaluateNative(
  proc: ChildProcessWithoutNullStreams,
  fen: string,
  depth: number
): Promise<{ score: number; best: string }> {
  return new Promise(resolve => {
    let best = ''
    let score = 0
    const onData = (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        const m = line.match(/score (cp|mate) (-?\d+)/)
        if (m) {
          const type = m[1]
          const val = parseInt(m[2], 10)
          score = type === 'cp' ? val : val > 0 ? 30000 - val : -30000 - val
        }
        if (line.startsWith('bestmove')) {
          best = line.split(' ')[1]
          proc.stdout.off('data', onData)
          resolve({ score, best })
        }
      }
    }
    proc.stdout.on('data', onData)
    proc.stdin.write(`ucinewgame\nposition fen ${fen}\ngo depth ${depth}\n`)
  })
}

export async function annotate(
  game: Game,
  depth: number,
  engine: Engine
): Promise<Record<string, any> | null> {
  const chess = new Chess()
  const analysis: any[] = []

  const evaluate = (fen: string) =>
    engine.type === 'wasm'
      ? (engine.pool.run({ fen, depth }, { name: 'evaluate' }) as Promise<{
          score: number
          best: string
        }>)
      : evaluateNative(engine.proc, fen, depth)

  let prev = await evaluate(chess.fen())

  for (let i = 0; i < game.moves.length && i < 40; i++) {
    const move = game.moves[i]
    chess.move(move)
    const cur = await evaluate(chess.fen())
    const swing = Math.abs(prev.score - cur.score)
    if (swing >= 15) {
      const judgment = {
        name: swing >= 100 ? 'Blunder' : swing >= 50 ? 'Mistake' : 'Inaccuracy'
      } as { name: string; comment?: string }
      judgment.comment = `${judgment.name}. ${cur.best} was best.`
      analysis.push({ eval: cur.score, best: cur.best, judgment })
      break
    }
    if (Math.abs(cur.score) >= 30000 || Math.abs(prev.score) >= 30000) {
      break
    }
    prev = cur
  }

  if (analysis.length === 0) return null

  const headers = game.headers
  const id = createHash('sha1')
    .update(JSON.stringify(headers) + game.moves.join(' '))
    .digest('hex')

  return {
    id,
    opening: {
      eco: headers.ECO,
      name: headers.Opening
    },
    moves: game.moves.join(' '),
    analysis
  }
}

export default annotate

