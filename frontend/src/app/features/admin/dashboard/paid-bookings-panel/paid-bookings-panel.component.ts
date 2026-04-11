import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService } from '../../../../core/services/reservation.service';
import { Reservation } from '../../../../models/reservation.model';

@Component({
  selector: 'app-paid-bookings-panel',
  imports: [CommonModule],
  templateUrl: './paid-bookings-panel.component.html',
  styleUrl: './paid-bookings-panel.component.scss',
})
export class PaidBookingsPanelComponent implements OnInit {
  reservations: Reservation[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private reservationService: ReservationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reservationService.getReservations(undefined, true).subscribe({
      next: (res) => {
        this.reservations = res.filter(r => r.paymentMade === true);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load paid bookings.';
        this.cdr.detectChanges();
      },
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
