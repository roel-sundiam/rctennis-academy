import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface VisitEntry {
  page:      string;
  timestamp: string;
  userType:  'anonymous' | 'authenticated';
  username:  string | null;
  ipAddress: string | null;
}

@Component({
  selector: 'app-visitor-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visitor-monitor.component.html',
  styleUrl: './visitor-monitor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VisitorMonitorComponent implements OnInit, OnDestroy {
  @ViewChild('feedEl') feedEl!: ElementRef<HTMLElement>;

  entries: VisitEntry[] = [];
  minimized = false;
  connected = false;
  private lastTimestamp: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchInitial();
    this.pollTimer = setInterval(() => this.fetchNew(), 5_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  toggle(): void {
    this.minimized = !this.minimized;
  }

  clear(): void {
    this.entries = [];
    this.cdr.markForCheck();
  }

  formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  formatPage(page: string): string {
    if (page === '/') return 'Home';
    return page;
  }

  displayUser(entry: VisitEntry): string {
    if (entry.userType === 'authenticated') return entry.username ?? 'Admin';
    return entry.ipAddress ?? 'Anonymous';
  }

  private fetchInitial(): void {
    // Ping the endpoint to confirm connection, but start fresh — only show visits from now on
    this.lastTimestamp = new Date().toISOString();
    this.http.get<VisitEntry[]>('/api/analytics/live').subscribe({
      next: () => {
        this.connected = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.connected = false;
        this.cdr.markForCheck();
      }
    });
  }

  private fetchNew(): void {
    const params = this.lastTimestamp ? `?since=${encodeURIComponent(this.lastTimestamp)}` : '';
    this.http.get<VisitEntry[]>(`/api/analytics/live${params}`).subscribe({
      next: data => {
        this.connected = true;
        if (!data.length) return;
        this.entries = [...this.entries, ...data].slice(-100); // keep last 100
        this.lastTimestamp = data[data.length - 1].timestamp;
        this.cdr.markForCheck();
        this.scrollToBottom();
      },
      error: () => {
        this.connected = false;
        this.cdr.markForCheck();
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.feedEl?.nativeElement) {
        this.feedEl.nativeElement.scrollTop = this.feedEl.nativeElement.scrollHeight;
      }
    }, 30);
  }
}
