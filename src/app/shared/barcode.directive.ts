import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import JsBarcode from 'jsbarcode';

@Directive({
  selector: 'svg[appBarcode]',
  standalone: true
})
export class BarcodeDirective implements OnChanges {
  @Input() value: string | undefined;
  @Input() format: string = 'CODE128';
  @Input() lineColor: string = '#000';
  @Input() displayValue = false;
  @Input() barHeight = 120; // px
  @Input() barWidth = 2; // module width in px
  @Input() margin = 0; // px

  constructor(private el: ElementRef<SVGSVGElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.render();
  }

  private render() {
    const v = this.value ?? '';
    try {
      const el = this.el.nativeElement;
      // Let CSS control width; we set height explicitly via option
      el.style.width = '100%';
      JsBarcode(el, v, {
        format: this.format as any,
        lineColor: this.lineColor,
        displayValue: this.displayValue,
        height: this.barHeight,
        width: this.barWidth,
        margin: this.margin
      });
    } catch (e) {
      console.warn('Barcode render failed', e);
    }
  }
}
