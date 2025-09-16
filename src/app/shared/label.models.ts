export interface TemplateRecord {
  id: string; // T.Id
  name: string; // Template.Name
}

export interface ComponentRecord {
  templateId: string; // T.Id
  componentId: string; // C.Id
  name: string; // C.Name
  // Bounding box corners as percentages relative to the canvas
  xLeftTop: number;
  yLeftTop: number;
  xRightTop: number;
  yRightTop: number;
  xLeftBottom: number;
  yLeftBottom: number;
  xRightBottom: number;
  yRightBottom: number;
  data?: any; // Arbitrary payload
}

export interface BarCodeRecord {
  id: string;
  data: Record<string, any>;
}

export interface TemplatePayload {
  template: TemplateRecord;
  components: ComponentRecord[];
  barcode?: BarCodeRecord;
  width?: number;
  height?: number;
}
