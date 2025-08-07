import fs from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect } from 'vitest'
import { splitByEco } from '../src/splitByEco.js'

describe('splitByEco', () => {
  it('splits PGN into ECO files', async () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), 'packs-'))
    await splitByEco({ pgn: 'test/fixtures/a00_test.pgn', out: dir, limit: 0 })
    const file = path.join(dir, 'A00.ndjson')
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n')
    expect(lines.length).toBeGreaterThan(0)
  })
})
