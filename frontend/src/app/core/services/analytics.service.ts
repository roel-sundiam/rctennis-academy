import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalyticsSummary {
  totalVisits: number;
  totalLogins: number;
  visitsByPage: { _id: string; count: number }[];
  loginsByUser: { _id: string; count: number }[];
  visitsByDay:  { _id: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly apiUrl = '/api/analytics';

  constructor(private http: HttpClient) {}

  trackPage(page: string): void {
    // Fire-and-forget — ignore errors so tracking never breaks the UI
    this.http.post(`${this.apiUrl}/track`, { page }).subscribe({ error: () => {} });
  }

  getSummary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.apiUrl}/summary`);
  }
}
