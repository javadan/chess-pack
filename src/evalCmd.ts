import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import Piscina from 'piscina'
import { streamPgn } from './streamPgn.js'
import { annotate, type Engine } from './annotateGame.js'

interface Opts {
  pgn: string
  out: string
  depth: number
  threads: number
  engine: 'wasm' | 'native'
}

export async function run(opts: Opts): Promise<void> {
  const { pgn, out, depth, threads, engine } = opts
  await fs.promises.mkdir(path.dirname(out), { recursive: true })
  const outStream = fs.createWriteStream(out)

  let handle: Engine
  if (engine === 'wasm') {
    const pool = new Piscina({
      filename: new URL('./stockfishWorker.js', import.meta.url).pathname,
      maxThreads: threads
    })
    handle = { type: 'wasm', pool }
  } else {
    const proc: ChildProcessWithoutNullStreams = spawn('stockfish')
    proc.on('error', () => {
      console.error(
        "native engine 'stockfish' not found on PATH—please install it."
      )
      process.exit(1)
    })
    const ready = new Promise<void>(resolve => {
      const onData = (data: Buffer) => {
        if (data.toString().includes('uciok')) {
          proc.stdout.off('data', onData)
          resolve()
        }
      }
      proc.stdout.on('data', onData)
    })
    proc.stdin.write('uci\n')
    await ready
    proc.stdin.write(`setoption name Threads value ${threads}\n`)
    handle = { type: 'native', proc }
    process.on('SIGINT', () => {
      proc.kill()
      process.exit(1)
    })
  }

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
    const obj = await annotate(game, depth, handle)
    if (obj) {
      outStream.write(JSON.stringify(obj) + '\n')
      written++
    }
  }

  clearInterval(timer)
  outStream.end()
  if (handle.type === 'native') handle.proc.kill()
  else await handle.pool.destroy()
  const duration = (Date.now() - start) / 1000
  console.log(`\ncompleted in ${duration.toFixed(1)}s`)
  console.log(`games scanned: ${scanned}`)
  console.log(`files written: ${written}`)
}

export default run

