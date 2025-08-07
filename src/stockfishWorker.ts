import Stockfish from 'stockfish.wasm'

let enginePromise: Promise<any> | null = null

async function getEngine() {
  if (!enginePromise) {
    const base = new URL('../node_modules/stockfish.wasm/', import.meta.url)
    const g: any = globalThis
    const oldFetch = g.fetch
    g.fetch = undefined
    enginePromise = (Stockfish as any)({
      locateFile: (p: string) => new URL(p, base).pathname
    })
    g.fetch = oldFetch
  }
  return enginePromise
}

export async function evaluate(
  fen: string,
  depth: number
): Promise<{ score: number; best: string }> {
  const engine = await getEngine()
  return new Promise(resolve => {
    let best = ''
    let score = 0
    engine.onmessage = (line: string) => {
      const m = line.match(/score (cp|mate) (-?\d+)/)
      if (m) {
        const type = m[1]
        const val = parseInt(m[2], 10)
        score = type === 'cp' ? val : val > 0 ? 30000 - val : -30000 - val
      }
      if (line.startsWith('bestmove')) {
        best = line.split(' ')[1]
        resolve({ score, best })
      }
    }
    engine.postMessage('uci')
    engine.postMessage('ucinewgame')
    engine.postMessage(`position fen ${fen}`)
    engine.postMessage(`go depth ${depth}`)
  })
}

export default evaluate

