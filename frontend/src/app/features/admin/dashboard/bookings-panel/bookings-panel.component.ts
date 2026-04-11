import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService } from '../../../../core/services/reservation.service';
import { Reservation, ReservationStatus } from '../../../../models/reservation.model';

@Component({
  selector: 'app-bookings-panel',
  imports: [CommonModule],
  templateUrl: './bookings-panel.component.html',
  styleUrl: './bookings-panel.component.scss'
})
export class BookingsPanelComponent {
  private _status: ReservationStatus = 'pending';

  @Input()
  set status(value: ReservationStatus) {
    this._status = value;
    this.load();
  }
  get status(): ReservationStatus {
    return this._status;
  }

  reservations: Reservation[] = [];
  loading = false;
  errorMessage = '';
  actionError: Record<string, string> = {};
  actionLoading: Record<string, boolean> = {};

  constructor(
    private reservationService: ReservationService,
    private cdr: ChangeDetectorRef
  ) {}

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reservationService.getReservations(this._status).subscribe({
      next: res => {
        this.reservations = res;
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
