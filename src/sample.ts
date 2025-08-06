import type { PackPuzzle } from './mineMistakes.js'

export async function sample(puzzles: AsyncIterable<PackPuzzle>, limit = 1000): Promise<PackPuzzle[]> {
  const res: PackPuzzle[] = []
  let count = 0
  for await (const p of puzzles) {
    count++
    if (res.length < limit) res.push(p)
    else {
      const idx = Math.floor(Math.random() * count)
      if (idx < limit) res[idx] = p
    }
  }
  return res
}
