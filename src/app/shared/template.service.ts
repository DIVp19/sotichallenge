import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TemplatePayload } from './label.models';

const STORAGE_KEY = 'template_payload_v1';

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private _current = new BehaviorSubject<TemplatePayload | null>(null);

  constructor() {
    // hydrate from localStorage if present
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TemplatePayload;
        this._current.next(parsed);
      }
    } catch (e) {
      console.warn('Failed to load template from localStorage', e);
    }
  }

  setTemplate(payload: TemplatePayload) {
    this._current.next(payload);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to persist template to localStorage', e);
    }
  }

  clear() {
    this._current.next(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  get current$(): Observable<TemplatePayload | null> {
    return this._current.asObservable();
  }

  getCurrent(): TemplatePayload | null {
    return this._current.value;
  }
}
