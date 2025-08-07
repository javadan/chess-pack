import { execa, ExecaChildProcess } from 'execa'
import { Readable } from 'node:stream'
import readline from 'node:readline'

export function spawnPipeline(cmds: [string, string[]][]): ExecaChildProcess {
  let proc = execa(cmds[0][0], cmds[0][1], { stdout: 'pipe' })
  let current = proc
  for (const [cmd, args] of cmds.slice(1)) {
    const next = execa(cmd, args, { stdin: 'pipe', stdout: 'pipe' })
    current.stdout!.pipe(next.stdin!)
    current = next
  }
  return current
}

export async function lineCounter(stream: Readable): Promise<number> {
  const rl = readline.createInterface({ input: stream })
  let count = 0
  for await (const _ of rl) count++
  return count
}
