import { Routes } from '@angular/router';
import { BuilderComponent } from './builder/builder.component';
import { AdminComponent } from './admin/admin.component';

export const routes: Routes = [
  { path: 'builder', component: BuilderComponent },
  { path: 'admin', component: AdminComponent },
  { path: '', pathMatch: 'full', redirectTo: 'builder' },
  { path: '**', redirectTo: 'builder' }
];
