import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BookingsPanelComponent } from './bookings-panel/bookings-panel.component';
import { PlayersPanelComponent } from './players-panel/players-panel.component';
import { BlockedSlotsPanelComponent } from './blocked-slots-panel/blocked-slots-panel.component';
import { PaidBookingsPanelComponent } from './paid-bookings-panel/paid-bookings-panel.component';
import { AdminProfilePanelComponent } from '../profile-panel/admin-profile-panel.component';
import { ReservationStatus } from '../../../models/reservation.model';

type AdminTab = 'pending' | 'approved' | 'rejected' | 'players' | 'blocked' | 'paid';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    BookingsPanelComponent,
    PlayersPanelComponent,
    BlockedSlotsPanelComponent,
    PaidBookingsPanelComponent,
    AdminProfilePanelComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  activeTab: AdminTab = 'pending';
  profileOpen = false;

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

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

  get bookingStatus(): ReservationStatus {
    return this.activeTab as ReservationStatus;
  }

  get isBookingTab(): boolean {
    return this.activeTab === 'pending' || this.activeTab === 'approved' || this.activeTab === 'rejected';
  }
}
