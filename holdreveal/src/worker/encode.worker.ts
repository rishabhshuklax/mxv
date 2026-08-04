/// <reference lib="webworker" />
import {
  encodeSwap,
  encodeGhost,
  type SwapParams,
  type GhostParams,
} from '../lib/encoding'

export type WorkerRequest =
  | {
      id: number
      type: 'swap'
      cover: Uint8ClampedArray
      hidden: Uint8ClampedArray
      width: number
      height: number
      params: SwapParams
    }
  | {
      id: number
      type: 'ghost'
      image: Uint8ClampedArray
      mask: Uint8Array
      width: number
      height: number
      params: GhostParams
    }
  | {
      id: number
      type: 'export'
      rgba: Uint8ClampedArray
      width: number
      height: number
    }

export type WorkerResponse =
  | { id: number; type: 'pixels'; rgba: Uint8ClampedArray }
  | { id: number; type: 'png'; png: ArrayBuffer }
  | { id: number; type: 'error'; message: string }

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  try {
    if (msg.type === 'swap') {
      const rgba = encodeSwap(msg.cover, msg.hidden, msg.width, msg.height, msg.params)
      const res: WorkerResponse = { id: msg.id, type: 'pixels', rgba }
      self.postMessage(res, { transfer: [rgba.buffer] })
    } else if (msg.type === 'ghost') {
      const rgba = encodeGhost(msg.image, msg.mask, msg.width, msg.height, msg.params)
      const res: WorkerResponse = { id: msg.id, type: 'pixels', rgba }
      self.postMessage(res, { transfer: [rgba.buffer] })
    } else if (msg.type === 'export') {
      // UPNG is lazy-loaded so it never lands in the first bundle. Its UMD
      // header expects `window.pako` when `require` is unavailable — supply
      // both on the worker's global before importing it.
      const pakoMod = await import('pako')
      const g = self as unknown as { window: unknown; pako: unknown }
      g.pako = (pakoMod as { default?: unknown }).default ?? pakoMod
      g.window = self
      const UPNG = (await import('upng-js')).default
      const png = UPNG.encode(
        [msg.rgba.buffer as ArrayBuffer],
        msg.width,
        msg.height,
        256,
      )
      const res: WorkerResponse = { id: msg.id, type: 'png', png }
      self.postMessage(res, { transfer: [png] })
    }
  } catch (err) {
    const res: WorkerResponse = {
      id: msg.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(res)
  }
}
