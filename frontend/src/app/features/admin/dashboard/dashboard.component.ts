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
import { PaymentReceiptsPanelComponent } from './payment-receipts-panel/payment-receipts-panel.component';
import { AdminProfilePanelComponent } from '../profile-panel/admin-profile-panel.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { Reservation } from '../../../models/reservation.model';
import { BlockedSlot } from '../../../models/blocked-slot.model';
import { Player } from '../../../models/player.model';

type AdminTab = 'bookings' | 'players' | 'payments';

interface UpcomingAlert {
  id: string;
  label: string;
  courtId: string;
  startTime: string;
  type: 'booking' | 'blocked';
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    BookingsPanelComponent,
    PlayersPanelComponent,
    PaymentReceiptsPanelComponent,
    AdminProfilePanelComponent,
    ModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  activeTab: AdminTab = 'bookings';
  profileOpen = false;

  pendingBadgeCount = 0;
  toasts: Reservation[] = [];

  pendingPlayerBadgeCount = 0;
  playerToasts: Player[] = [];

  upcomingAlerts: UpcomingAlert[] = [];

  todayLabel = '';
  todayBookings: Reservation[] = [];
  todayBlocked: BlockedSlot[] = [];
  todayLoading = false;

  private subs = new Subscription();
  private upcomingCheckHandle: ReturnType<typeof setInterval> | null = null;
  private dismissedAlertIds = new Set<string>();

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
    this.startUpcomingCheck();

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

    this.subs.add(
      this.notificationService.pendingPlayerCount$.subscribe(
        (count) => (this.pendingPlayerBadgeCount = count)
      )
    );

    this.subs.add(
      this.notificationService.newPlayer$.subscribe((player) => {
        if (!player) return;
        this.showPlayerToast(player);
      })
    );
  }

  ngOnDestroy(): void {
    this.notificationService.stopPolling();
    this.subs.unsubscribe();
    if (this.upcomingCheckHandle !== null) {
      clearInterval(this.upcomingCheckHandle);
    }
  }

  private showToast(reservation: Reservation): void {
    this.toasts = [reservation, ...this.toasts].slice(0, 3);
    this.cdr.detectChanges();
    setTimeout(() => this.dismissToast(reservation._id), 6_000);
  }

  dismissToast(id: string): void {
    this.toasts = this.toasts.filter((r) => r._id !== id);
    this.cdr.detectChanges();
  }

  private showPlayerToast(player: Player): void {
    this.playerToasts = [player, ...this.playerToasts].slice(0, 3);
    this.cdr.detectChanges();
    setTimeout(() => this.dismissPlayerToast(player._id), 6_000);
  }

  dismissPlayerToast(id: string): void {
    this.playerToasts = this.playerToasts.filter((p) => p._id !== id);
    this.cdr.detectChanges();
  }

  private startUpcomingCheck(): void {
    this.checkUpcomingSessions();
    this.upcomingCheckHandle = setInterval(() => this.checkUpcomingSessions(), 60_000);
  }

  checkUpcomingSessions(): void {
    const bookingAlerts: UpcomingAlert[] = this.todayBookings
      .filter((b) => {
        const mins = this.minutesUntil(b.StartTime);
        return mins >= 1 && mins <= 15 && !this.dismissedAlertIds.has(b._id);
      })
      .map((b) => ({ id: b._id, label: b.playerName, courtId: b.courtId, startTime: b.StartTime, type: 'booking' as const }));

    const blockedAlerts: UpcomingAlert[] = this.todayBlocked
      .filter((s) => {
        const mins = this.minutesUntil(s.StartTime);
        return mins >= 1 && mins <= 15 && !this.dismissedAlertIds.has(s._id);
      })
      .map((s) => ({ id: s._id!, label: s.reason, courtId: s.courtId, startTime: s.StartTime, type: 'blocked' as const }));

    this.upcomingAlerts = [...bookingAlerts, ...blockedAlerts]
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    this.cdr.detectChanges();
  }

  minutesUntil(startTime: string): number {
    const [h, m] = startTime.split(':').map(Number);
    const now = new Date();
    return (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
  }

  dismissUpcomingAlert(id: string): void {
    this.dismissedAlertIds.add(id);
    this.checkUpcomingSessions();
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
        this.checkUpcomingSessions();
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
