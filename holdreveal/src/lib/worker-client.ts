import type { SwapParams, GhostParams } from './encoding'
import type { WorkerResponse } from '../worker/encode.worker'

/**
 * Thin promise wrapper around the encode worker. The worker is created on
 * first use so it stays out of the landing page's critical path.
 */
let worker: Worker | null = null
let nextId = 1
const pending = new Map<
  number,
  { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }
>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../worker/encode.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const p = pending.get(e.data.id)
      if (!p) return
      pending.delete(e.data.id)
      if (e.data.type === 'error') p.reject(new Error(e.data.message))
      else p.resolve(e.data)
    }
  }
  return worker
}

function call(msg: object, transfer: Transferable[]): Promise<WorkerResponse> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ ...msg, id }, transfer)
  })
}

export async function workerEncodeSwap(
  cover: ImageData,
  hidden: ImageData,
  params: SwapParams,
): Promise<ImageData> {
  // Copy so the caller's ImageData buffers stay usable after transfer.
  const c = new Uint8ClampedArray(cover.data)
  const h = new Uint8ClampedArray(hidden.data)
  const res = await call(
    { type: 'swap', cover: c, hidden: h, width: cover.width, height: cover.height, params },
    [c.buffer, h.buffer],
  )
  if (res.type !== 'pixels') throw new Error('unexpected worker response')
  return new ImageData(
    res.rgba as Uint8ClampedArray<ArrayBuffer>,
    cover.width,
    cover.height,
  )
}

export async function workerEncodeGhost(
  image: ImageData,
  mask: Uint8Array,
  params: GhostParams,
): Promise<ImageData> {
  const img = new Uint8ClampedArray(image.data)
  const m = new Uint8Array(mask)
  const res = await call(
    { type: 'ghost', image: img, mask: m, width: image.width, height: image.height, params },
    [img.buffer, m.buffer],
  )
  if (res.type !== 'pixels') throw new Error('unexpected worker response')
  return new ImageData(
    res.rgba as Uint8ClampedArray<ArrayBuffer>,
    image.width,
    image.height,
  )
}

export async function workerExportPng(rgba: ImageData): Promise<ArrayBuffer> {
  const data = new Uint8ClampedArray(rgba.data)
  const res = await call(
    { type: 'export', rgba: data, width: rgba.width, height: rgba.height },
    [data.buffer],
  )
  if (res.type !== 'png') throw new Error('unexpected worker response')
  return res.png
}
