import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { VisitorMonitorComponent } from './features/admin/dashboard/visitor-monitor/visitor-monitor.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, VisitorMonitorComponent],
  template: `
    <router-outlet />
    @if (auth.isSuperAdmin()) {
      <app-visitor-monitor />
    }
  `,
  styles: []
})
export class App {
  constructor(public auth: AuthService) {}
}
