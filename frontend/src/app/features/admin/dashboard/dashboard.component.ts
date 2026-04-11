import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BookingsPanelComponent } from './bookings-panel/bookings-panel.component';
import { PlayersPanelComponent } from './players-panel/players-panel.component';
import { AdminProfilePanelComponent } from '../profile-panel/admin-profile-panel.component';
import { Reservation } from '../../../models/reservation.model';

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

  private subs = new Subscription();

  constructor(
    public auth: AuthService,
    private router: Router,
    public notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.notificationService.requestPermission();
    this.notificationService.startPolling(30_000);

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
