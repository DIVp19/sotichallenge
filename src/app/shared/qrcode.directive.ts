import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import * as QRCode from 'qrcode';

@Directive({
  selector: 'canvas[appQrCode]',
  standalone: true
})
export class QrCodeDirective implements OnChanges {
  @Input() value: string | undefined;

  constructor(private el: ElementRef<HTMLCanvasElement>) {}

  ngOnChanges(): void {
    this.render();
  }

  private async render() {
    const v = this.value ?? '';
    try {
      await QRCode.toCanvas(this.el.nativeElement, v, { margin: 0, scale: 4 });
    } catch (e) {
      console.warn('QR render failed', e);
    }
  }
}
