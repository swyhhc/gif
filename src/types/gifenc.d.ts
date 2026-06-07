declare module 'gifenc' {
  export type RGB = [number, number, number];

  export type WriteFrameOptions = {
    palette: RGB[];
    delay: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    repeat?: number;
  };

  export type Encoder = {
    writeFrame(indexed: Uint8Array, width: number, height: number, options: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  };

  export function GIFEncoder(): Encoder;
  export function quantize(data: Uint8ClampedArray, maxColors: number): RGB[];
  export function applyPalette(data: Uint8ClampedArray, palette: RGB[]): Uint8Array;
}
