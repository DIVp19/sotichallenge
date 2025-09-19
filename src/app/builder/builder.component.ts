import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CdkDragDrop, DragRef } from '@angular/cdk/drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TemplateService } from '../shared/template.service';
import { TemplatePayload, ComponentRecord } from '../shared/label.models';
import { ProductService, ProductDTO } from '../shared/product.service';
import { BarcodeDirective } from '../shared/barcode.directive';
import { QrCodeDirective } from '../shared/qrcode.directive';
import Swal from 'sweetalert2';

interface CanvasWidget {
  id: string;
  name: string; 
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PaletteWidget {
  name: string; 
  disabled: boolean; 
}

type Corner = 'se' | 'sw' | 'ne' | 'nw';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss'],
  standalone: true,
  imports: [CommonModule, DragDropModule, BarcodeDirective, QrCodeDirective]
})
export class BuilderComponent {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLDivElement>;

  private readonly snapStep = 2; 
  private readonly edgeThreshold = 1.0;
  private readonly apiBase = 'http://localhost:5088';

  private newTemplateId() {
    try { return (crypto as any).randomUUID(); } catch { return 'tpl-' + Date.now(); }
  }

  // Helper to compute style for preview box in modal
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

  closePreview() {
    this.isPreviewOpen = false;
    this.previewPayload = null;
  }
  private templateId: string = this.newTemplateId();

  guideX: number | null = null;
  guideY: number | null = null;

  paletteWidgets: PaletteWidget[] = [
    { name: 'Logo', disabled: false },
    { name: 'ShipTo', disabled: false },
    { name: 'QR', disabled: false },
    { name: 'BarcodeSmall', disabled: false },
    { name: 'BarcodeLarge', disabled: false },
    { name: 'Text', disabled: false }
  ];

  canvasWidgets: CanvasWidget[] = [];
  isMenuOpen: boolean = false;

  width = 500;
  height = 800;

  private resizing: { widget: CanvasWidget; corner: Corner; startX: number; startY: number; startW: number; startH: number; startLeft: number; startTop: number } | null = null;

  private lastSafePx: Record<string, { left: number; top: number }> = {};

  // Preview modal state
  isPreviewOpen: boolean = false;
  previewPayload: TemplatePayload | null = null;

  constructor(private cdr: ChangeDetectorRef, private templateService: TemplateService, private router: Router, private productService: ProductService) {}

  toggleMenu() { this.isMenuOpen = !this.isMenuOpen; }

  private clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }
  private snap(val: number) { return Math.round(val / this.snapStep) * this.snapStep; }

  private overlaps(a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private anyOverlap(candidate: {x:number;y:number;w:number;h:number}, ignoreId?: string) {
    return this.canvasWidgets.some(w => w.id !== ignoreId && this.overlaps(candidate, { x: w.x, y: w.y, w: w.w, h: w.h }));
  }

  private resolveCollisions(widget: CanvasWidget) {
    let pos = { x: widget.x, y: widget.y, w: widget.w, h: widget.h };
    if (!this.anyOverlap(pos, widget.id)) return; 

    for (let y = 0; y <= 100 - widget.h; y += this.snapStep) {
      for (let x = 0; x <= 100 - widget.w; x += this.snapStep) {
        const cand = { x, y, w: widget.w, h: widget.h };
        if (!this.anyOverlap(cand, widget.id)) {
          widget.x = x; widget.y = y;
          return;
        }
      }
    }
  }

  private buildComponentsFromCanvas(): ComponentRecord[] {
    return this.canvasWidgets.map((w, idx) => ({
      templateId: this.templateId,
      componentId: w.id || `C-${idx + 1}`,
      name: w.name,
      xLeftTop: w.x,
      yLeftTop: w.y,
      xRightTop: w.x + w.w,
      yRightTop: w.y,
      xLeftBottom: w.x,
      yLeftBottom: w.y + w.h,
      xRightBottom: w.x + w.w,
      yRightBottom: w.y + w.h,
      data: this.componentDataFor(w.name)
    }));
  }

  private persistCurrentTemplate() {
    const payload: TemplatePayload = {
      template: { id: this.templateId, name: 'User Template' },
      width: this.width,
      height: this.height,
      components: this.buildComponentsFromCanvas()
    };
    this.templateService.setTemplate(payload);
  }

  private applyEdgeSnap(leftPct: number, topPct: number, boxW: number, boxH: number, ignoreId?: string) {
    let x = leftPct; let y = topPct; this.guideX = null; this.guideY = null;

    const candidatesX: number[] = [0, 100 - boxW]; 
    const candidatesY: number[] = [0, 100 - boxH]; 

    for (const w of this.canvasWidgets) {
      if (w.id === ignoreId) continue;
      candidatesX.push(w.x, w.x + w.w);
      candidatesY.push(w.y, w.y + w.h);
    }

    const nearest = (val: number, arr: number[]) => {
      let best = { v: val, d: Number.MAX_VALUE };
      for (const a of arr) {
        const d = Math.abs(a - val);
        if (d < best.d) best = { v: a, d };
      }
      return best;
    };

    const nx = nearest(x, candidatesX);
    if (nx.d <= this.edgeThreshold) { x = nx.v; this.guideX = x; }
    const ny = nearest(y, candidatesY);
    if (ny.d <= this.edgeThreshold) { y = ny.v; this.guideY = y; }

    return { x, y };
  }

  constrainPosition = (point: { x: number; y: number }, dragRef: DragRef) => {
    const el = dragRef.getRootElement() as HTMLElement;
    const id = el.getAttribute('data-id');
    if (!this.canvasEl || !id) return point;

    const canvasRect = this.canvasEl.nativeElement.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    let left = this.clamp(point.x, canvasRect.left, canvasRect.right - elRect.width);
    let top = this.clamp(point.y, canvasRect.top, canvasRect.bottom - elRect.height);

    const w = this.canvasWidgets.find(w => w.id === id);
    if (!w) return { x: left, y: top };

    let leftPct = ((left - canvasRect.left) / canvasRect.width) * 100;
    let topPct = ((top - canvasRect.top) / canvasRect.height) * 100;
    leftPct = this.snap(leftPct);
    topPct = this.snap(topPct);

    const snapped = this.applyEdgeSnap(leftPct, topPct, w.w, w.h, id);
    leftPct = snapped.x; topPct = snapped.y;

    const cand = { x: leftPct, y: topPct, w: w.w, h: w.h };
    if (!this.anyOverlap(cand, id)) {
      const safeLeft = canvasRect.left + (leftPct / 100) * canvasRect.width;
      const safeTop = canvasRect.top + (topPct / 100) * canvasRect.height;
      this.lastSafePx[id] = { left: safeLeft, top: safeTop };
      return { x: safeLeft, y: safeTop };
    }

    const fallback = this.lastSafePx[id];
    if (fallback) return { x: fallback.left, y: fallback.top };
    return { x: left, y: top };
  };

  onDragStart(event: any, widget: CanvasWidget) {
    const el: HTMLElement = event.source.element.nativeElement;
    const box = el.getBoundingClientRect();
    this.lastSafePx[widget.id] = { left: box.left, top: box.top };
  }

  drop(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) return;

    const widgetData = event.item.data as PaletteWidget;

    const defaults: Record<string, { w: number; h: number }> = {
      Logo: { w: 30, h: 12 },
      ShipTo: { w: 60, h: 20 },
      QR: { w: 25, h: 25 },
      BarcodeSmall: { w: 65, h: 20 },
      BarcodeLarge: { w: 100, h: 25 },
      Text: { w: 40, h: 10 }
    };
    const def = defaults[widgetData.name] ?? { w: 30, h: 25 };

    const canvasRect = this.canvasEl?.nativeElement.getBoundingClientRect();
    let xPct = 35;
    let yPct = 35;

    const anyEvent: any = event as any;
    const dropPoint = anyEvent.dropPoint as { x: number; y: number } | undefined;
    if (canvasRect && dropPoint) {
      const relX = dropPoint.x - canvasRect.left;
      const relY = dropPoint.y - canvasRect.top;
      xPct = (relX / canvasRect.width) * 100 - def.w / 2;
      yPct = (relY / canvasRect.height) * 100 - def.h / 2;
    }

    xPct = this.clamp(this.snap(xPct), 0, 100 - def.w);
    yPct = this.clamp(this.snap(yPct), 0, 100 - def.h);

    const snapped = this.applyEdgeSnap(xPct, yPct, def.w, def.h);
    xPct = snapped.x; yPct = snapped.y;

    const newWidget: CanvasWidget = { id: `${widgetData.name}-${Date.now()}`, name: widgetData.name, x: xPct, y: yPct, w: def.w, h: def.h };
    this.canvasWidgets.push(newWidget);
    this.resolveCollisions(newWidget);

    this.cdr.detectChanges();
    // Persist coordinates after placing the widget
    this.persistCurrentTemplate();
  }

  onDragEnd(event: any, widget: CanvasWidget) {
    const canvasRect = this.canvasEl?.nativeElement.getBoundingClientRect();
    if (!canvasRect) return;

    const el: HTMLElement = event.source.element.nativeElement;
    const box = el.getBoundingClientRect();
    const left = box.left - canvasRect.left;
    const top = box.top - canvasRect.top;
    let newX = (left / canvasRect.width) * 100;
    let newY = (top / canvasRect.height) * 100;

    newX = this.snap(newX); newY = this.snap(newY);

    const snapped = this.applyEdgeSnap(newX, newY, widget.w, widget.h, widget.id);
    newX = snapped.x; newY = snapped.y;

    widget.x = this.clamp(newX, 0, 100 - widget.w);
    widget.y = this.clamp(newY, 0, 100 - widget.h);
    this.resolveCollisions(widget);

    this.guideX = null; this.guideY = null;
    // Persist coordinates after drag end
    this.persistCurrentTemplate();
  }

  onResizeMouseDown(e: MouseEvent, widget: CanvasWidget, corner: Corner) {
    e.preventDefault(); e.stopPropagation();
    const canvasRect = this.canvasEl?.nativeElement.getBoundingClientRect();
    if (!canvasRect) return;

    this.resizing = { widget, corner, startX: e.clientX, startY: e.clientY, startW: widget.w, startH: widget.h, startLeft: widget.x, startTop: widget.y };

    const onMove = (ev: MouseEvent) => this.onResizeMouseMove(ev, canvasRect);
    const onUp = () => this.onResizeMouseUp(onMove, onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  }

  private onResizeMouseMove(ev: MouseEvent, canvasRect: DOMRect) {
    if (!this.resizing) return;
    const r = this.resizing;

    const dxPx = ev.clientX - r.startX;
    const dyPx = ev.clientY - r.startY;
    const dxPct = (dxPx / canvasRect.width) * 100;
    const dyPct = (dyPx / canvasRect.height) * 100;

    let newW = r.startW; let newH = r.startH; let newX = r.startLeft; let newY = r.startTop;

    if (r.corner === 'se') { newW = r.startW + dxPct; newH = r.startH + dyPct; }
    else if (r.corner === 'sw') { newW = r.startW - dxPct; newH = r.startH + dyPct; newX = r.startLeft + dxPct; }
    else if (r.corner === 'ne') { newW = r.startW + dxPct; newH = r.startH - dyPct; newY = r.startTop + dyPct; }
    else if (r.corner === 'nw') { newW = r.startW - dxPct; newH = r.startH - dyPct; newX = r.startLeft + dxPct; newY = r.startTop + dyPct; }

    newW = this.clamp(this.snap(newW), 5, 100 - newX);
    newH = this.clamp(this.snap(newH), 5, 100 - newY);
    newX = this.clamp(this.snap(newX), 0, 100 - newW);
    newY = this.clamp(this.snap(newY), 0, 100 - newH);

    const snapped = this.applyEdgeSnap(newX, newY, newW, newH, r.widget.id);
    newX = snapped.x; newY = snapped.y;

    const cand = { x: newX, y: newY, w: newW, h: newH };
    if (this.anyOverlap(cand, r.widget.id)) return;

    r.widget.w = newW; r.widget.h = newH; r.widget.x = newX; r.widget.y = newY;
  }

  private onResizeMouseUp(onMove: any, onUp: any) {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp as any);
    this.guideX = null; this.guideY = null;
    this.resizing = null;
    // Persist coordinates after resize end
    this.persistCurrentTemplate();
  }

  resetCanvas() {
    this.canvasWidgets = [];
    this.templateId = this.newTemplateId();
    this.templateService.clear();
  }

  previewTemplate() {
    const payload: TemplatePayload = {
      template: { id: this.templateId, name: 'User Template' },
      width: this.width,
      height: this.height,
      components: this.buildComponentsFromCanvas()
    };
    this.templateService.setTemplate(payload);
    this.previewPayload = payload;
    this.isPreviewOpen = true;
  }

  async saveTemplate() {
    // Log coordinates to console for inspection
    const components = this.buildComponentsFromCanvas();
    console.log('[Builder] Saving template components (corner coordinates as %):', components);
    console.log('[Builder] Canvas size (for scaling reference):', { width: this.width, height: this.height });

    // Build payload for API
    const payload: TemplatePayload = {
      template: { id: this.templateId, name: 'User Template' },
      width: this.width,
      height: this.height,
      components
    };

    // POST to API
    try {
      const res = await fetch(`${this.apiBase}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[Builder] API save failed', res.status, text);
        await Swal.fire({ icon: 'error', title: 'Save failed', text: text || `HTTP ${res.status}` });
      } else {
        const json = await res.json();
        console.log('[Builder] API save success:', json);
        await Swal.fire({ icon: 'success', title: 'Template saved', text: `Saved ${json?.count ?? components.length} component(s).` });
        this.closePreview();
        this.resetCanvas();
      }
    } catch (err) {
      console.error('[Builder] API save error:', err);
      await Swal.fire({ icon: 'error', title: 'Save error', text: (err as any)?.message ?? 'Unknown error' });
    }
  }

  generateFromProduct() {
    this.productService.getProduct().subscribe((p: ProductDTO) => {
      this.templateId = this.newTemplateId();
      const components: ComponentRecord[] = [
        { templateId: this.templateId, componentId: 'C-LOGO', name: 'Logo', xLeftTop: 0, yLeftTop: 0, xRightTop: 35, yRightTop: 0, xLeftBottom: 0, yLeftBottom: 12, xRightBottom: 35, yRightBottom: 12, data: { text: 'amazon.com' } },
        { templateId: this.templateId, componentId: 'C-SHIPTO', name: 'ShipTo', xLeftTop: 35, yLeftTop: 0, xRightTop: 100, yRightTop: 0, xLeftBottom: 35, yLeftBottom: 20, xRightBottom: 100, yRightBottom: 20, data: { title: 'SHIP TO:', address: p.recipientAddress } },
        { templateId: this.templateId, componentId: 'C-QR', name: 'QR', xLeftTop: 0, yLeftTop: 20, xRightTop: 30, yRightTop: 20, xLeftBottom: 0, yLeftBottom: 45, xRightBottom: 30, yRightBottom: 45, data: { value: p.qrValue } },
        { templateId: this.templateId, componentId: 'C-CODE-TOP', name: 'BarcodeSmall', xLeftTop: 30, yLeftTop: 20, xRightTop: 100, yRightTop: 20, xLeftBottom: 30, yLeftBottom: 45, xRightBottom: 100, yRightBottom: 45, data: { value: p.trackingNumber } },
        { templateId: this.templateId, componentId: 'C-TRACK', name: 'Tracking', xLeftTop: 0, yLeftTop: 45, xRightTop: 100, yRightTop: 45, xLeftBottom: 0, yLeftBottom: 60, xRightBottom: 100, yRightBottom: 60, data: { line1: '(Tracking Information)', line2: p.carrierName, line3: p.trackingNumber } },
        { templateId: this.templateId, componentId: 'C-BARCODE', name: 'BarcodeLarge', xLeftTop: 0, yLeftTop: 60, xRightTop: 100, yRightTop: 60, xLeftBottom: 0, yLeftBottom: 85, xRightBottom: 100, yRightBottom: 85, data: { value: p.barcodeValue } },
        { templateId: this.templateId, componentId: 'C-WEIGHT', name: 'Weight', xLeftTop: 0, yLeftTop: 85, xRightTop: 100, yRightTop: 85, xLeftBottom: 0, yLeftBottom: 100, xRightBottom: 100, yRightBottom: 100, data: { label: `Weight: ${p.weight}` } }
      ];

      const payload: TemplatePayload = {
        template: { id: this.templateId, name: 'Data-driven Label' },
        width: this.width,
        height: this.height,
        components
      };

      this.templateService.setTemplate(payload);
      this.router.navigate(['/admin']);
    });
  }

  private componentDataFor(name: string): any {
    switch (name) {
      case 'QR': return { value: 'QR123' };
      case 'BarcodeSmall': return { value: '123654789' };
      case 'BarcodeLarge': return { value: '6009785922537712345678' };
      case 'ShipTo': return { title: 'SHIP TO:', address: '(shipping address)' };
      case 'Logo': return { text: 'amazon.com' };
      case 'Text': return { text: 'Sample Text' };
      default: return {};
    }
  }
}
