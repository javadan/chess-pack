import fs from 'node:fs'
import path from 'node:path'
import { lineCounter } from './util/stream.js'

interface Opts {
  dir: string
}

export async function stats(opts: Opts): Promise<void> {
  const dir = opts.dir
  const files = (await fs.promises.readdir(dir)).filter(f => f.endsWith('.ndjson'))
  const rows: { eco: string; count: number }[] = []
  let total = 0
  for (const file of files) {
    const count = await lineCounter(fs.createReadStream(path.join(dir, file)))
    rows.push({ eco: path.basename(file, '.ndjson'), count })
    total += count
  }
  rows.sort((a, b) => b.count - a.count)
  console.log('ECO   games')
  for (const r of rows) {
    console.log(`${r.eco.padEnd(4)} ${r.count.toLocaleString()}`)
  }
  console.log(`Total ${total.toLocaleString()}   files:${files.length}`)
}
