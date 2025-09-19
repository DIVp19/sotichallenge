import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateService } from '../shared/template.service';
import { TemplatePayload, TemplateRecord, ComponentRecord, BarCodeRecord } from '../shared/label.models';
import { BarcodeDirective } from '../shared/barcode.directive';
import { QrCodeDirective } from '../shared/qrcode.directive';

declare const window: any;

interface ComponentRow {
  id: number;
  templateId: string;
  componentId: string;
  name: string;
  xLeftTop: number; yLeftTop: number;
  xRightTop: number; yRightTop: number;
  xLeftBottom: number; yLeftBottom: number;
  xRightBottom: number; yRightBottom: number;
  dataJson?: string | null;
}

interface GroupedTemplate {
  templateId: string;
  components: ComponentRow[];
}

const API_BASE = 'http://localhost:5088';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, BarcodeDirective, QrCodeDirective],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  // List view state
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  groups = signal<GroupedTemplate[]>([]);
  viewingList = signal<boolean>(true);

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
      data: { value: 'xxxxxxxxxxxxxxxxxxxxxx' } },

    // Footer (90-100%)
    { templateId: 'T-1001', componentId: 'C-WEIGHT', name: 'Weight',
      xLeftTop: 0, yLeftTop: 90, xRightTop: 100, yRightTop: 90,
      xLeftBottom: 0, yLeftBottom: 100, xRightBottom: 100, yRightBottom: 100,
      data: { label: 'Weight:' } }
  ];

  constructor(private templateService: TemplateService) {}

  async ngOnInit() {
    // Always start in list view; user can select a template to edit
    this.viewingList.set(true);
    await this.loadTemplates();
  }

  private applyPayload(payload: TemplatePayload) {
    this.template = payload.template;
    this.components = payload.components;
    this.barcode = payload.barcode ?? this.barcode;
    if (payload.width) this.width = payload.width;
    if (payload.height) this.height = payload.height;
  }

  async loadTemplates() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${API_BASE}/api/templates`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows: ComponentRow[] = await res.json();
      const map = new Map<string, ComponentRow[]>();
      for (const r of rows) {
        if (!map.has(r.templateId)) map.set(r.templateId, []);
        map.get(r.templateId)!.push(r);
      }
      const grouped: GroupedTemplate[] = Array.from(map.entries()).map(([templateId, components]) => ({ templateId, components }));
      this.groups.set(grouped);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load templates');
    } finally {
      this.loading.set(false);
    }
  }

  parseData(c: ComponentRow): any {
    try { return c.dataJson ? JSON.parse(c.dataJson) : null; } catch { return null; }
  }

  useTemplate(g: GroupedTemplate) {
    const payload: TemplatePayload = {
      template: { id: g.templateId, name: `Template ${g.templateId.slice(0, 8)}` },
      width: this.width,
      height: this.height,
      components: g.components.map((c) => ({
        templateId: c.templateId,
        componentId: c.componentId,
        name: c.name,
        xLeftTop: c.xLeftTop,
        yLeftTop: c.yLeftTop,
        xRightTop: c.xRightTop,
        yRightTop: c.yRightTop,
        xLeftBottom: c.xLeftBottom,
        yLeftBottom: c.yLeftBottom,
        xRightBottom: c.xRightBottom,
        yRightBottom: c.yRightBottom,
        data: this.parseData(c)
      }))
    };
    this.templateService.setTemplate(payload);
    this.applyPayload(payload);
    this.viewingList.set(false);
  }

  backToList() {
    this.viewingList.set(true);
    // do not clear service payload automatically; user can re-open editor quickly
    // reload list to reflect any new saves
    this.loadTemplates();
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

  // Compute an appropriate barcode height (in px) from the component block height.
  // Leave some space for digits (approx 24px) below bars.
  computeBarHeight(c: ComponentRecord): number {
    const blockHeightPx = ((c.yLeftBottom - c.yLeftTop) / 100) * this.height;
    const barHeight = Math.max(60, Math.floor(blockHeightPx - 28));
    return barHeight;
  }

  // --- Editing support ---
  selected: ComponentRecord | null = null;

  select(c: ComponentRecord) {
    this.selected = c;
  }

  private ensureDataObject(c: ComponentRecord) {
    if (!c.data || typeof c.data !== 'object') {
      c.data = {} as any;
    }
  }

  setField(c: ComponentRecord, key: string, value: any) {
    this.ensureDataObject(c);
    (c.data as any)[key] = value;
    // persist to service for consistency across routes
    this.templateService.setTemplate({ template: this.template, components: this.components, barcode: this.barcode, width: this.width, height: this.height });
  }

  renameComponent(c: ComponentRecord, value: string) {
    c.name = value;
    this.templateService.setTemplate({ template: this.template, components: this.components, barcode: this.barcode, width: this.width, height: this.height });
  }

  renameTemplate(value: string) {
    this.template = { ...this.template, name: value };
    this.templateService.setTemplate({ template: this.template, components: this.components, barcode: this.barcode, width: this.width, height: this.height });
  }
}
