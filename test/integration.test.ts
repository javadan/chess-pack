import { test, expect } from 'vitest'
import { rm, stat } from 'node:fs/promises'
import { main } from '../src/cli.js'

test('integration A00', async () => {
  await rm('tmp', { recursive: true, force: true })
  await main(['make','--eco','A00','--source','test/fixtures/a00.ndjson','--out','tmp','--maxGames','50'])
  const info = await stat('tmp/pack_A00_v1.zip')
  expect(info.size).toBeGreaterThan(0)
})
