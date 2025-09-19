import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TemplateService } from '../shared/template.service';
import { TemplatePayload } from '../shared/label.models';

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
  selector: 'app-templates-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-list.component.html',
  styleUrls: ['./templates-list.component.scss']
})
export class TemplatesListComponent implements OnInit {
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  groups = signal<GroupedTemplate[]>([]);

  constructor(private templateService: TemplateService, private router: Router) {}

  async ngOnInit() {
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

  // Helper to compute style for preview boxes using stored percentages
  boxStyle(c: ComponentRow) {
    const x = c.xLeftTop;
    const y = c.yLeftTop;
    const w = c.xRightTop - c.xLeftTop;
    const h = c.yLeftBottom - c.yLeftTop;
    return {
      left: `${x}%`,
      top: `${y}%`,
      width: `${w}%`,
      height: `${h}%`
    } as any;
  }

  parseData(c: ComponentRow): any {
    try { return c.dataJson ? JSON.parse(c.dataJson) : null; } catch { return null; }
  }

  useTemplate(g: GroupedTemplate) {
    // Build a payload compatible with Admin/TemplateService
    const payload: TemplatePayload = {
      template: { id: g.templateId, name: `Template ${g.templateId.slice(0, 8)}` },
      width: 384,
      height: 576,
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
    this.router.navigate(['/admin']);
  }
}
