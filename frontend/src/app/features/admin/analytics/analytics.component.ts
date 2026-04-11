import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalyticsService, AnalyticsSummary } from '../../../core/services/analytics.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  summary: AnalyticsSummary | null = null;
  loading = true;
  errorMessage = '';
  username: string | null;

  constructor(
    private analyticsService: AnalyticsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.username = this.authService.getUsername();
  }

  ngOnInit(): void {
    this.analyticsService.getSummary().subscribe({
      next: data => {
        this.summary = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load analytics.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatPage(page: string): string {
    if (page === '/') return 'Home (/)';
    return page;
  }
}
