#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { fetchGames } from './fetchGames.js'
import { mineMistakes } from './mineMistakes.js'
import { dedupe } from './dedupe.js'
import { sample } from './sample.js'
import { pack } from './packer.js'
import { splitByEco } from './splitByEco.js'
import { stats } from './stats.js'
import { run as evalCmd } from './evalCmd.js'

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
    .command('split', 'split PGN by ECO', (y: any) => y
      .option('pgn', { type: 'string', demandOption: true })
      .option('out', { type: 'string', default: 'packs' })
      .option('ecoPrefix', { type: 'string' })
      .option('limit', { type: 'number', default: 0 })
    , async (argv: any) => {
      await splitByEco(argv)
    })
    .command(
      'eval',
      'annotate PGN with Stockfish',
      (y: any) =>
        y
          .option('pgn', { type: 'string', demandOption: true })
          .option('out', { type: 'string', demandOption: true })
          .option('depth', { type: 'number', default: 12 })
          .option('threads', { type: 'number', default: 1 })
          .option('engine', {
            describe: 'Which Stockfish engine to use',
            choices: ['wasm', 'native'],
            default: 'wasm',
            type: 'string'
          }),
      async ({ pgn, out, depth, threads, engine }: any) => {
        await evalCmd({ pgn, out, depth, threads, engine })
      }
    )
    .command('stats', 'show stats for packs', (y: any) => y
      .option('dir', { type: 'string', default: 'packs' })
    , async (argv: any) => {
      await stats(argv)
    })
    .demandCommand(1)
    .help()
    .parseAsync()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
