import fs from 'node:fs'
import path from 'node:path'
import { streamPgn } from './streamPgn.js'

interface Opts {
  pgn: string
  out: string
  ecoPrefix?: string
  limit: number
}

export async function splitByEco(opts: Opts): Promise<void> {
  const { pgn, out, ecoPrefix, limit } = opts
  const start = Date.now()
  await fs.promises.mkdir(out, { recursive: true })
  const writers: Record<string, fs.WriteStream> = {}
  const counts: Record<string, number> = {}
  let total = 0

  const ensureWriter = (eco: string) => {
    if (!writers[eco]) {
      const file = path.join(out, `${eco}.ndjson`)
      writers[eco] = fs.createWriteStream(file, { flags: 'a' })
      counts[eco] = 0
    }
    return writers[eco]
  }

  const closeAll = async () => {
    await Promise.all(
      Object.values(writers).map(
        w => new Promise(res => w.end(res))
      )
    )
  }

  process.on('SIGINT', () => {
    closeAll().then(() => process.exit(0))
  })

  for await (const game of streamPgn(pgn)) {
    const eco = game.headers.ECO
    if (!eco) continue
    if (ecoPrefix && !eco.startsWith(ecoPrefix)) continue
    const line = JSON.stringify({ opening: { eco }, moves: game.moves })
    ensureWriter(eco).write(line + '\n')
    counts[eco]++
    total++
    if (total % 1000 === 0) {
      console.log(
        Object.entries(counts)
          .map(([e, c]) => `${e}: ${c.toLocaleString()}`)
          .join('  |  ')
      )
    }
    if (limit && total >= limit) break
  }

  await closeAll()

  const duration = Date.now() - start
  const mins = Math.floor(duration / 60000)
  const secs = Math.floor((duration % 60000) / 1000)
  const files = Object.keys(counts).length
  let largestEco = ''
  let largest = 0
  for (const [e, c] of Object.entries(counts)) {
    if (c > largest) {
      largestEco = e
      largest = c
    }
  }
  console.log(`Split complete  (${mins} min ${secs} s) `)
  console.log(`files written:  ${files}`)
  console.log(`total games:    ${total.toLocaleString()}`)
  if (largestEco)
    console.log(`largest file:   ${largestEco}.ndjson (${largest.toLocaleString()} games)`)
}
