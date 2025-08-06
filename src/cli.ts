#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { fetchGames } from './fetchGames.js'
import { mineMistakes } from './mineMistakes.js'
import { dedupe } from './dedupe.js'
import { sample } from './sample.js'
import { pack } from './packer.js'

export async function main(argv = hideBin(process.argv)) {
  await yargs(argv)
    .command('make', 'build puzzle pack', (y: any) => y
      .option('eco', { type: 'string', demandOption: true })
      .option('out', { type: 'string', default: './dist' })
      .option('source', { type: 'string', demandOption: true })
      .option('maxGames', { type: 'number', default: 1000 })
      .option('threads', { type: 'number', default: 1 })
    , async (args: any) => {
      const games = fetchGames(args.source as string, args.maxGames as number)
      const puzzles = await sample(dedupe(mineMistakes(games, args.eco as string)), 1000)
      await pack(args.out as string, args.eco as string, puzzles)
    })
    .demandCommand(1)
    .help()
    .parseAsync()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
