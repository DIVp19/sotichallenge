import { Component, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';

interface CanvasWidget {
  name: string;
}

interface PaletteWidget {
  name: string;
  disabled: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, DragDropModule]
})
export class AppComponent {
  paletteWidgets: PaletteWidget[] = [
    { name: 'Widget 1', disabled: false },
    { name: 'Widget 2', disabled: false },
    { name: 'Widget 3', disabled: false }
  ];

  canvasWidgets: CanvasWidget[] = [];
  isMenuOpen: boolean = false; // Add this property to control the menu

  constructor(private cdr: ChangeDetectorRef) {}

  // Add this method to toggle the menu's visibility
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  drop(event: CdkDragDrop<any>) {
    // Logic for dropping a widget from the palette to the canvas
    if (event.previousContainer === event.container) {
      return;
    }

    const widgetData = event.item.data as PaletteWidget;
    this.canvasWidgets.push({ name: widgetData.name });

    const paletteWidget = this.paletteWidgets.find(w => w.name === widgetData.name);
    if (paletteWidget) {
      paletteWidget.disabled = true;
    }
    this.cdr.detectChanges();
  }

  resetCanvas() {
    this.canvasWidgets = [];
    this.paletteWidgets.forEach(widget => widget.disabled = false);
    console.log('Process cancelled. Canvas and palette reset.');
  }

  saveTemplate() {
    console.log('Template saved:', this.canvasWidgets);
  }
}