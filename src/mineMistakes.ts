import { Chess } from 'chess.js'
import { createHash } from 'node:crypto'
import type { LichessGame } from './fetchGames.js'

export interface PackPuzzle {
  id: string
  fen: string
  best: string
  side: 'w' | 'b'
  eco: string
  opening: string
  evalBefore: number
  evalAfter: number
  tags: string[]
  src: { game: string, ply: number }
}

export async function *mineMistakes(games: AsyncIterable<LichessGame>, eco: string): AsyncGenerator<PackPuzzle> {
  for await (const g of games) {
    if (g.opening?.eco !== eco) continue
    const moves: string[] = g.moves ? g.moves.trim().split(/\s+/) : []
    const evals: number[] = g.evals || []
    const chess = new Chess()
    let prevEval = 0
    for (let i = 0; i < moves.length && i < evals.length; i++) {
      const before = prevEval
      const after = evals[i]
      if (i > 0 && Math.abs(after - before) >= 200) {
        const fen = chess.fen()
        const best = moves[i] || ''
        const id = createHash('sha1').update(fen + best).digest('hex')
        yield {
          id,
          fen,
          best,
          side: chess.turn(),
          eco: g.opening.eco,
          opening: g.opening.name,
          evalBefore: before,
          evalAfter: after,
          tags: [],
          src: { game: g.id, ply: i }
        }
        break
      }
      chess.move(moves[i], { sloppy: true } as any)
      prevEval = after
    }
  }
}
