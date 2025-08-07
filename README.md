# chess-pack

## Repository overview
`chess-pack` is a TypeScript/Node.js tool for producing zipped “puzzle packs” from Lichess NDJSON game data. It streams games from a file or URL, mines positions where the evaluation swings sharply, filters and samples puzzles, then bundles them with minimal metadata and a cover image into a distributable ZIP file. The project is organized around modular streaming utilities and exposes a CLI for building packs. Dependencies such as `chess.js`, `jszip`, and `yargs` support chess logic, ZIP creation, and command parsing respectively.

## File-by-file summary
- **src/cli.ts** – Entry point and CLI definition. Provides a `make` command that orchestrates fetching games, mining mistakes, deduping, sampling, and packing into a ZIP file.
- **src/fetchGames.ts** – Streams NDJSON-formatted Lichess games from a local file or HTTP source, yielding up to a specified number of games.
- **src/mineMistakes.ts** – Defines the `PackPuzzle` structure and identifies puzzle positions where engine evaluations swing by ≥200 centipawns, emitting one puzzle per qualifying game.
- **src/dedupe.ts** – Filters an asynchronous puzzle stream so each puzzle ID is yielded only once.
- **src/sample.ts** – Implements reservoir sampling to select up to `limit` puzzles uniformly from a stream.
- **src/packer.ts** – Creates output directories, composes a ZIP with metadata, puzzle list, optional cover image, and writes the final archive.
- **src/util/git.ts** – Helper that stages, commits, and pushes the repo; used for snapshotting progress.
- **test/integration.test.ts** – Vitest integration test ensuring the CLI can build a pack from fixture data and produce a non-empty ZIP file.
- **test/fixtures/a00.ndjson** – Sample NDJSON with a single game in opening “A00” used by the integration test.
- **package.json / tsconfig.json** – Define project metadata, build/test scripts, TypeScript compiler settings, and dependency versions.
- **README.md** – Minimal placeholder with repository title; no additional usage documentation provided.

## CLI usage
1. **Build the project** (compiles TypeScript to `dist`):
   ```bash
   npm run build
   ```
2. **Run the `make` command** to create a puzzle pack:
   ```bash
   node dist/cli.js make \
     --eco A00 \
     --source path/to/games.ndjson \
     --out ./dist \
     --maxGames 1000 \
     --threads 1
   ```
   - `--eco` *(required)*: ECO code to filter games.
   - `--source` *(required)*: NDJSON file or URL with Lichess games.
   - `--out` *(default `./dist`)*: Output directory for the ZIP.
   - `--maxGames` *(default `1000`)*: Limit on games to process.
   - `--threads` *(default `1`)*: Thread count (reserved for future parallelism).

   The command fetches games, mines one mistake-based puzzle per matching game, deduplicates puzzles, samples up to 1000 of them, and writes `pack_<ECO>_v1.zip` into the specified output directory.

## Split & Stats

Split a large PGN dump into per-ECO NDJSON files:

```
npm run build
node dist/cli.js split --pgn raw/lichess_db_standard_rated_2025-01.pgn.zst --out packs
```

Then view counts of games per ECO:

```
node dist/cli.js stats --dir packs
```

## Generate annotated NDJSON from PGN

Analyze a PGN file with Stockfish and emit NDJSON games in the same shape as the Lichess user API:

```
npm run build
node dist/cli.js eval \
  --pgn packs/B90.pgn \
  --out packs/B90.ndjson \
  --depth 12 \
  --threads 4
```

Each game is evaluated until the first ≥200 cp swing (or mate) and written as one line of NDJSON. Games without such a swing in the first 40 plies are skipped. The resulting file can be supplied to `make` via `--source`.

To use a native Stockfish binary instead of the default WASM build:

```
node dist/cli.js eval \
  --engine native \
  --pgn packs/B90.pgn \
  --out packs/B90.ndjson \
  --depth 17 \
  --threads 1
```

Ensure the `stockfish` executable is available on your `PATH` (for example, `brew install stockfish` on macOS).
