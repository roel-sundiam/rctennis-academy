import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { BlockedSlotService } from '../../../core/services/blocked-slot.service';
import { BookingsPanelComponent } from './bookings-panel/bookings-panel.component';
import { PlayersPanelComponent } from './players-panel/players-panel.component';
import { AdminProfilePanelComponent } from '../profile-panel/admin-profile-panel.component';
import { Reservation } from '../../../models/reservation.model';
import { BlockedSlot } from '../../../models/blocked-slot.model';

type AdminTab = 'bookings' | 'players';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    BookingsPanelComponent,
    PlayersPanelComponent,
    AdminProfilePanelComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  activeTab: AdminTab = 'bookings';
  profileOpen = false;

  pendingBadgeCount = 0;
  toasts: Reservation[] = [];

  todayLabel = '';
  todayBookings: Reservation[] = [];
  todayBlocked: BlockedSlot[] = [];
  todayLoading = false;

  private subs = new Subscription();

  constructor(
    public auth: AuthService,
    private router: Router,
    public notificationService: NotificationService,
    private reservationService: ReservationService,
    private blockedSlotService: BlockedSlotService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.notificationService.requestPermission();
    this.notificationService.startPolling(30_000);
    this.loadTodaySchedule();

    this.subs.add(
      this.notificationService.newBookingCount$.subscribe(
        (count) => (this.pendingBadgeCount = count)
      )
    );

    this.subs.add(
      this.notificationService.newBooking$.subscribe((reservation) => {
        if (!reservation) return;
        this.showToast(reservation);
      })
    );
  }

  ngOnDestroy(): void {
    this.notificationService.stopPolling();
    this.subs.unsubscribe();
  }

  private showToast(reservation: Reservation): void {
    this.toasts = [reservation, ...this.toasts].slice(0, 3);
    setTimeout(() => this.dismissToast(reservation._id), 6_000);
  }

  dismissToast(id: string): void {
    this.toasts = this.toasts.filter((r) => r._id !== id);
  }

  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
  }

  private loadTodaySchedule(): void {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    this.todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    this.todayLoading = true;

    forkJoin({
      bookings: this.reservationService.getPublicSchedule(monthStr),
      blocked: this.blockedSlotService.getPublicBlockedSlots(monthStr),
    }).subscribe({
      next: ({ bookings, blocked }) => {
        this.todayBookings = bookings
          .filter(b => b.ReserveDate === todayStr)
          .filter((b, i, arr) => arr.findIndex(x => x._id === b._id) === i)
          .sort((a, b) => a.StartTime.localeCompare(b.StartTime));
        this.todayBlocked = blocked
          .filter(s => s.ReserveDate === todayStr)
          .sort((a, b) => a.StartTime.localeCompare(b.StartTime));
        this.todayLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.todayLoading = false; this.cdr.detectChanges(); }
    });
  }

  isCurrentSlot(startTime: string, endTime: string): boolean {
    const now = new Date();
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const current = now.getHours() * 60 + now.getMinutes();
    return current >= start && current < end;
  }

  formatDate(d: string): string {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
  }

  goToAnalytics(): void {
    this.router.navigate(['/admin/analytics']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }

  get username(): string | null {
    return this.auth.getUsername();
  }

}
