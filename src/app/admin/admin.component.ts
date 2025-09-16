import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateService } from '../shared/template.service';
import { TemplatePayload, TemplateRecord, ComponentRecord, BarCodeRecord } from '../shared/label.models';
import { BarcodeDirective } from '../shared/barcode.directive';
import { QrCodeDirective } from '../shared/qrcode.directive';

declare const window: any;

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, BarcodeDirective, QrCodeDirective],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  template: TemplateRecord = { id: 'T-1001', name: 'Amazon Shipping Label' };
  barcode: BarCodeRecord = { id: 'BC-7890', data: { value: '123654789' } };

  // Target ~4x6" label (96dpi approximated)
  width = 384;
  height = 576;

  components: ComponentRecord[] = [
    // Header row: ~0-15% left logo, 0-20% right ship-to
    { templateId: 'T-1001', componentId: 'C-LOGO', name: 'Logo',
      xLeftTop: 0, yLeftTop: 0, xRightTop: 40, yRightTop: 0,
      xLeftBottom: 0, yLeftBottom: 15, xRightBottom: 40, yRightBottom: 15,
      data: { text: 'amazon.com' } },

    { templateId: 'T-1001', componentId: 'C-SHIPTO', name: 'ShipTo',
      xLeftTop: 40, yLeftTop: 0, xRightTop: 100, yRightTop: 0,
      xLeftBottom: 40, yLeftBottom: 20, xRightBottom: 100, yRightBottom: 20,
      data: { title: 'SHIP TO:', address: '(shipping address)' } },

    // Middle row: QR left, small barcode right (20-48%)
    { templateId: 'T-1001', componentId: 'C-QR', name: 'QR',
      xLeftTop: 0, yLeftTop: 20, xRightTop: 35, yRightTop: 20,
      xLeftBottom: 0, yLeftBottom: 48, xRightBottom: 35, yRightBottom: 48,
      data: { value: 'QR123' } },

    { templateId: 'T-1001', componentId: 'C-CODE-TOP', name: 'BarcodeSmall',
      xLeftTop: 35, yLeftTop: 20, xRightTop: 100, yRightTop: 20,
      xLeftBottom: 35, yLeftBottom: 48, xRightBottom: 100, yRightBottom: 48,
      data: { value: '1Z999AA10123456784' } },

    // Tracking block (48-65%)
    { templateId: 'T-1001', componentId: 'C-TRACK', name: 'Tracking',
      xLeftTop: 0, yLeftTop: 48, xRightTop: 100, yRightTop: 48,
      xLeftBottom: 0, yLeftBottom: 65, xRightBottom: 100, yRightBottom: 65,
      data: { line1: '(Tracking Information)', line2: 'Carrier Name', line3: 'Tracking #' } },

    // Large barcode (65-90%)
    { templateId: 'T-1001', componentId: 'C-BARCODE', name: 'BarcodeLarge',
      xLeftTop: 0, yLeftTop: 65, xRightTop: 100, yRightTop: 65,
      xLeftBottom: 0, yLeftBottom: 90, xRightBottom: 100, yRightBottom: 90,
      data: { value: '6009785922537712345678' } },

    // Footer (90-100%)
    { templateId: 'T-1001', componentId: 'C-WEIGHT', name: 'Weight',
      xLeftTop: 0, yLeftTop: 90, xRightTop: 100, yRightTop: 90,
      xLeftBottom: 0, yLeftBottom: 100, xRightBottom: 100, yRightBottom: 100,
      data: { label: 'Weight:' } }
  ];

  constructor(private templateService: TemplateService) {
    const payload: TemplatePayload | null = this.templateService.getCurrent();
    if (payload) {
      this.template = payload.template;
      this.components = payload.components;
      this.barcode = payload.barcode ?? this.barcode;
      if (payload.width) this.width = payload.width;
      if (payload.height) this.height = payload.height;
    }
  }

  onPrint() { window.print(); }

  toBoxStyle(c: ComponentRecord) {
    const x = (pct: number) => (pct / 100) * this.width;
    const y = (pct: number) => (pct / 100) * this.height;
    const left = x(c.xLeftTop);
    const top = y(c.yLeftTop);
    const right = x(c.xRightTop);
    const bottom = y(c.yLeftBottom);
    const w = right - left;
    const h = bottom - top;
    return { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' } as any;
  }
}
