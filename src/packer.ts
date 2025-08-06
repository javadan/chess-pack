import JSZip from 'jszip'
import { writeFile, mkdir } from 'node:fs/promises'
import type { PackPuzzle } from './mineMistakes.js'

export async function pack(outDir: string, eco: string, puzzles: PackPuzzle[]) {
  await mkdir(outDir, { recursive: true })
  const zip = new JSZip()
  const meta = { eco, version: 'v1', puzzles: puzzles.length, build: new Date().toISOString() }
  zip.file('pack_meta.json', JSON.stringify(meta))
  zip.file('puzzles.ndjson', puzzles.map(p => JSON.stringify(p)).join('\n'))
  zip.file('LICENSE.txt', 'CC0')
  if (puzzles[0]) {
    try {
      const fen = encodeURIComponent(puzzles[0].fen)
      const res = await fetch(`https://lichess1.org/export/fen.png?fen=${fen}`)
      const buf = Buffer.from(await res.arrayBuffer())
      zip.file('cover.png', buf)
    } catch {}
  }
  const content = await zip.generateAsync({ type: 'nodebuffer' })
  await writeFile(`${outDir}/pack_${eco}_v1.zip`, content)
}
