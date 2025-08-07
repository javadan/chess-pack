import fs from 'node:fs'
import path from 'node:path'
import Piscina from 'piscina'
import { streamPgn } from './streamPgn.js'
import { annotate } from './annotateGame.js'

interface Opts {
  pgn: string
  out: string
  depth: number
  threads: number
}

export async function run(opts: Opts): Promise<void> {
  const { pgn, out, depth, threads } = opts
  await fs.promises.mkdir(path.dirname(out), { recursive: true })
  const outStream = fs.createWriteStream(out)
  const pool = new Piscina({
    filename: new URL('./stockfishWorker.js', import.meta.url).pathname,
    maxThreads: threads
  })

  let scanned = 0
  let written = 0
  const start = Date.now()
  const timer = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000
    const eta = scanned > 0 ? ((elapsed / scanned) * (scanned - written)) : 0
    process.stdout.write(
      `\rscanned: ${scanned}  written: ${written}  eta: ${eta.toFixed(1)}s`
    )
  }, 1000)

  for await (const game of streamPgn(pgn)) {
    scanned++
    const obj = await annotate(game, depth, pool)
    if (obj) {
      outStream.write(JSON.stringify(obj) + '\n')
      written++
    }
  }

  clearInterval(timer)
  outStream.end()
  const duration = (Date.now() - start) / 1000
  console.log(`\ncompleted in ${duration.toFixed(1)}s`) 
  console.log(`games scanned: ${scanned}`)
  console.log(`files written: ${written}`)
}

export default run

