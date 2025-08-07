import { Chess } from 'chess.js'
import { createHash } from 'node:crypto'
import type Piscina from 'piscina'
import type { Game } from './streamPgn.js'

export async function annotate(
  game: Game,
  depth: number,
  pool: Piscina
): Promise<Record<string, any> | null> {
  const chess = new Chess()
  const analysis: any[] = []
  let prev = await pool.run({ fen: chess.fen(), depth }, { name: 'evaluate' })
  let found = false

  for (let i = 0; i < game.moves.length && i < 40; i++) {
    const move = game.moves[i]
    chess.move(move)
    const cur = await pool.run(
      { fen: chess.fen(), depth },
      { name: 'evaluate' }
    )
    analysis.push({ eval: cur.score, best: cur.best })
    const swing = Math.abs(prev.score - cur.score)
    if (
      swing >= 200 ||
      Math.abs(cur.score) >= 30000 ||
      Math.abs(prev.score) >= 30000
    ) {
      found = true
      break
    }
    prev = cur
  }

  if (!found) return null

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

