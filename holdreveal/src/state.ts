import type { GhostParams, SwapParams } from './lib/encoding'

export type Mode = 'ghost' | 'swap'
export type Screen = 'landing' | 'choose' | 'edit' | 'preview' | 'export'

export interface GhostProject {
  image: ImageData
  /** One byte per pixel, 255 = painted teaser. */
  mask: Uint8Array
  params: GhostParams
}

export interface SwapProject {
  cover: ImageData
  /** Original hidden image before crop-to-cover-aspect. */
  hiddenSource: ImageData
  /** Crop placement of the hidden image inside the cover's frame. */
  crop: { offsetX: number; offsetY: number; zoom: number }
  params: SwapParams
}

export interface Project {
  mode: Mode
  ghost?: GhostProject
  swap?: SwapProject
  /** Final encoded transparent image, produced by the edit step. */
  encoded?: ImageData
}
