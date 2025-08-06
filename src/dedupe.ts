import type { PackPuzzle } from './mineMistakes.js'

export async function *dedupe(puzzles: AsyncIterable<PackPuzzle>): AsyncGenerator<PackPuzzle> {
  const seen = new Set<string>()
  for await (const p of puzzles) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    yield p
  }
}
