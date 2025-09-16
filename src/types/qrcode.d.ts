declare module 'qrcode' {
  export interface QRCodeToCanvasOptions {
    margin?: number;
    scale?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToCanvasOptions
  ): Promise<void>;
}
