import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import flatpickr from 'flatpickr';
import { PlayerService } from '../../core/services/player.service';
import { ReservationService } from '../../core/services/reservation.service';
import { BlockedSlotService } from '../../core/services/blocked-slot.service';
import { Player } from '../../models/player.model';
import { Reservation } from '../../models/reservation.model';

const PAYMENT_METHODS = [
  { value: 'maya',                 label: 'Maya' },
  { value: 'gcash',                label: 'GCash' },
  { value: 'bank_transfer_maybank', label: 'Bank Transfer - Maybank' },
  { value: 'cash',                 label: 'Cash' },
];

const TIME_SLOTS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];

@Component({
  selector: 'app-booking',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
})
export class BookingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('dateInput') dateInputRef!: ElementRef;

  players: Player[] = [];
  loadingPlayers = true;

  form = {
    playerId: '',
    courtId: 'Court1',
    ReserveDate: '',
    StartTime: '',
    EndTime: '',
    paymentMade: false,
    paymentMethod: '',
    paymentAmount: null as number | null,
    paymentReference: '',
  };

  timeSlots = TIME_SLOTS;
  paymentMethods = PAYMENT_METHODS;

  bookedSlots = new Set<string>();
  blockedSlots: Array<{ StartTime: string; EndTime: string }> = [];
  loadingSlots = false;

  submitting = false;
  successBooking: Reservation | null = null;
  errorMessage = '';
  validationErrors: Record<string, string> = {};

  today = new Date().toISOString().split('T')[0];

  private datePicker: any;

  constructor(
    private playerService: PlayerService,
    private reservationService: ReservationService,
    private blockedSlotService: BlockedSlotService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.playerService.getActivePlayers().subscribe({
      next: (players) => {
        this.players = players;
        this.loadingPlayers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingPlayers = false;
        this.errorMessage = 'Failed to load players. Please refresh.';
        this.cdr.detectChanges();
      },
    });
  }

  ngAfterViewInit(): void {
    this.datePicker = flatpickr(this.dateInputRef.nativeElement, {
      minDate: 'today',
      dateFormat: 'Y-m-d',
      disableMobile: false,
      onChange: (selectedDates: Date[], dateStr: string) => {
        this.form.ReserveDate = dateStr;
        this.form.StartTime = '';
        this.form.EndTime = '';
        delete this.validationErrors['ReserveDate'];
        this.loadBookedSlots(dateStr);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.datePicker) this.datePicker.destroy();
  }

  loadBookedSlots(dateStr: string): void {
    const month = dateStr.slice(0, 7); // "YYYY-MM"
    this.loadingSlots = true;
    this.bookedSlots = new Set();
    this.blockedSlots = [];

    let reservationsDone = false;
    let blockedDone = false;
    const checkDone = () => {
      if (reservationsDone && blockedDone) {
        this.loadingSlots = false;
        this.cdr.detectChanges();
      }
    };

    this.reservationService.getPublicSchedule(month).subscribe({
      next: (reservations) => {
        this.bookedSlots = new Set(
          reservations
            .filter(r => r.ReserveDate === dateStr)
            .map(r => r.StartTime)
        );
        reservationsDone = true;
        checkDone();
      },
      error: () => { reservationsDone = true; checkDone(); },
    });

    this.blockedSlotService.getPublicBlockedSlots(month).subscribe({
      next: (slots) => {
        this.blockedSlots = slots
          .filter(s => s.ReserveDate === dateStr)
          .map(s => ({ StartTime: s.StartTime, EndTime: s.EndTime }));
        blockedDone = true;
        checkDone();
      },
      error: () => { blockedDone = true; checkDone(); },
    });
  }

  isBooked(slot: string): boolean {
    return this.bookedSlots.has(slot);
  }

  isBlocked(slot: string): boolean {
    // A time slot button (e.g. "17:00") represents the hour starting at that time.
    // It's blocked if any blocked range overlaps [slot, slot+1h).
    const slotEnd = `${String(Number(slot.split(':')[0]) + 1).padStart(2, '0')}:00`;
    return this.blockedSlots.some(b => b.StartTime < slotEnd && b.EndTime > slot);
  }

  isPast(slot: string): boolean {
    if (this.form.ReserveDate !== this.today) return false;
    const [h] = slot.split(':').map(Number);
    return h < new Date().getHours();
  }

  isUnavailable(slot: string): boolean {
    return this.isBooked(slot) || this.isBlocked(slot) || this.isPast(slot);
  }

  selectStartTime(time: string): void {
    this.form.StartTime = time;
    const [h, m] = time.split(':').map(Number);
    const end = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.form.EndTime = end;
    delete this.validationErrors['StartTime'];
  }

  formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
  }

  togglePayment(paid: boolean): void {
    this.form.paymentMade = paid;
    if (paid) {
      delete this.validationErrors['paymentMade'];
    } else {
      this.form.paymentMethod = '';
      this.form.paymentAmount = null;
      this.form.paymentReference = '';
      delete this.validationErrors['paymentMethod'];
      delete this.validationErrors['paymentAmount'];
    }
  }

  validate(): boolean {
    this.validationErrors = {};
    if (!this.form.playerId) this.validationErrors['playerId'] = 'Please select a player.';
    if (!this.form.ReserveDate) this.validationErrors['ReserveDate'] = 'Please select a date.';
    if (!this.form.StartTime) this.validationErrors['StartTime'] = 'Please select a time slot.';
    if (!this.form.paymentMade) {
      this.validationErrors['paymentMade'] = 'Payment must be made before submitting.';
    } else {
      if (!this.form.paymentMethod) this.validationErrors['paymentMethod'] = 'Please select a payment method.';
      if (this.form.paymentAmount == null || this.form.paymentAmount <= 0)
        this.validationErrors['paymentAmount'] = 'Please enter a valid amount.';
    }
    return Object.keys(this.validationErrors).length === 0;
  }

  submit(): void {
    this.errorMessage = '';
    this.successBooking = null;
    if (!this.validate()) return;

    this.submitting = true;
    this.reservationService.createReservation(this.form).subscribe({
      next: (reservation) => {
        this.successBooking = reservation;
        this.submitting = false;
        this.form = {
          playerId: '',
          courtId: 'Court1',
          ReserveDate: '',
          StartTime: '',
          EndTime: '',
          paymentMade: false,
          paymentMethod: '',
          paymentAmount: null,
          paymentReference: '',
        };
        this.validationErrors = {};
        this.datePicker?.clear();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Something went wrong. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  bookAnother(): void {
    this.successBooking = null;
    this.errorMessage = '';
  }
}
