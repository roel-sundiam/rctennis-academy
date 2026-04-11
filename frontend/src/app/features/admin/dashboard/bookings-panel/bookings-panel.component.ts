import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService } from '../../../../core/services/reservation.service';
import { Reservation, ReservationStatus } from '../../../../models/reservation.model';
import { BlockedSlotsPanelComponent } from '../blocked-slots-panel/blocked-slots-panel.component';

type BookingFilter = ReservationStatus | 'paid' | 'blocked';

@Component({
  selector: 'app-bookings-panel',
  imports: [CommonModule, BlockedSlotsPanelComponent],
  templateUrl: './bookings-panel.component.html',
  styleUrl: './bookings-panel.component.scss'
})
export class BookingsPanelComponent implements OnInit {
  @Input() pendingCount = 0;

  bookingStatus: BookingFilter = 'pending';

  reservations: Reservation[] = [];
  loading = false;
  errorMessage = '';
  actionError: Record<string, string> = {};
  actionLoading: Record<string, boolean> = {};

  constructor(
    private reservationService: ReservationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  setBookingStatus(status: BookingFilter): void {
    this.bookingStatus = status;
    this.load();
  }

  load(): void {
    if (this.bookingStatus === 'blocked') return;

    this.loading = true;
    this.errorMessage = '';

    const obs = this.bookingStatus === 'paid'
      ? this.reservationService.getReservations(undefined, true)
      : this.reservationService.getReservations(this.bookingStatus);

    obs.subscribe({
      next: res => {
        this.reservations = this.bookingStatus === 'paid'
          ? res.filter(r => r.paymentMade === true)
          : res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load bookings.';
        this.cdr.detectChanges();
      }
    });
  }

  approve(id: string): void {
    this.actionLoading[id] = true;
    this.actionError[id] = '';
    this.reservationService.approveReservation(id).subscribe({
      next: () => {
        this.reservations = this.reservations.filter(r => r._id !== id);
        this.actionLoading[id] = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.actionLoading[id] = false;
        this.actionError[id] = err.error?.message || 'Failed to approve.';
        this.cdr.detectChanges();
      }
    });
  }

  reject(id: string): void {
    this.actionLoading[id] = true;
    this.actionError[id] = '';
    this.reservationService.rejectReservation(id).subscribe({
      next: () => {
        this.reservations = this.reservations.filter(r => r._id !== id);
        this.actionLoading[id] = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.actionLoading[id] = false;
        this.actionError[id] = err.error?.message || 'Failed to reject.';
        this.cdr.detectChanges();
      }
    });
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

  formatPaymentMethod(method: string | null | undefined): string {
    const labels: Record<string, string> = {
      maya:                  'Maya',
      gcash:                 'GCash',
      bank_transfer_maybank: 'Bank Transfer - Maybank',
      cash:                  'Cash',
    };
    return method ? (labels[method] ?? method) : '—';
  }
}
