import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../../core/services/reservation.service';
import { Reservation, ReservationStatus } from '../../../../models/reservation.model';
import { BlockedSlotsPanelComponent } from '../blocked-slots-panel/blocked-slots-panel.component';
import { PlayerService } from '../../../../core/services/player.service';
import { Player } from '../../../../models/player.model';
import { ModalService } from '../../../../core/services/modal.service';

type BookingFilter = ReservationStatus | 'paid' | 'blocked';

@Component({
  selector: 'app-bookings-panel',
  imports: [CommonModule, FormsModule, BlockedSlotsPanelComponent],
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

  // Date filter
  filterFrom = '';
  filterTo = '';

  // Edit
  players: Player[] = [];
  editingId: string | null = null;
  editPlayerName = '';
  editError = '';
  editLoading = false;

  // Delete
  deleteLoading: Record<string, boolean> = {};

  constructor(
    private reservationService: ReservationService,
    private playerService: PlayerService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
    this.playerService.getActivePlayers().subscribe({
      next: (players) => { this.players = players; this.cdr.detectChanges(); },
    });
  }

  setBookingStatus(status: BookingFilter): void {
    this.bookingStatus = status;
    this.load();
  }

  load(): void {
    if (this.bookingStatus === 'blocked') return;

    this.loading = true;
    this.errorMessage = '';

    const from = this.filterFrom || undefined;
    const to   = this.filterTo   || undefined;

    const obs = this.bookingStatus === 'paid'
      ? this.reservationService.getReservations(undefined, true, from, to)
      : this.reservationService.getReservations(this.bookingStatus as ReservationStatus, undefined, from, to);

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

  startEdit(r: Reservation): void {
    this.editingId = r._id;
    this.editPlayerName = r.playerName;
    this.editError = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editError = '';
  }

  submitEdit(): void {
    if (!this.editPlayerName) { this.editError = 'Please select a player.'; return; }
    this.editLoading = true;
    this.editError = '';
    this.reservationService.updateReservation(this.editingId!, this.editPlayerName).subscribe({
      next: (updated) => {
        const idx = this.reservations.findIndex(r => r._id === updated._id);
        if (idx > -1) this.reservations[idx] = updated;
        this.editingId = null;
        this.editLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.editError = err?.error?.message || 'Failed to update.';
        this.editLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  async deleteReservation(r: Reservation): Promise<void> {
    const confirmed = await this.modalService.open({
      type: 'danger',
      title: 'Delete Reservation',
      message: `Delete ${r.playerName}'s reservation on ${this.formatDate(r.ReserveDate)} at ${this.formatTime(r.StartTime)}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    this.deleteLoading[r._id] = true;
    this.reservationService.deleteReservation(r._id).subscribe({
      next: () => {
        this.reservations = this.reservations.filter(res => res._id !== r._id);
        this.deleteLoading[r._id] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.deleteLoading[r._id] = false;
        this.cdr.detectChanges();
      },
    });
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
