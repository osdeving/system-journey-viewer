declare module 'gifenc' {
  export type GifColor = [number, number, number] | [number, number, number, number]

  export interface GifEncoderFrameOptions {
    palette?: GifColor[]
    first?: boolean
    transparent?: boolean
    transparentIndex?: number
    delay?: number
    repeat?: number
    colorDepth?: number
    dispose?: number
  }

  export interface GifEncoderStream {
    writeByte: (byte: number) => void
    writeBytes: (
      bytes: Uint8Array,
      offset?: number,
      byteLength?: number,
    ) => void
  }

  export interface GifEncoderInstance {
    reset: () => void
    finish: () => void
    bytes: () => Uint8Array
    bytesView: () => Uint8Array
    writeHeader: () => void
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      opts?: GifEncoderFrameOptions,
    ) => void
    readonly buffer: ArrayBuffer
    readonly stream: GifEncoderStream
  }

  export const GIFEncoder: (
    options?: { initialCapacity?: number; auto?: boolean },
  ) => GifEncoderInstance

  export const quantize: (
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444'
      oneBitAlpha?: boolean | number
      clearAlpha?: boolean
      clearAlphaThreshold?: number
      clearAlphaColor?: number
    },
  ) => GifColor[]

  export const applyPalette: (
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifColor[],
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ) => Uint8Array
}
