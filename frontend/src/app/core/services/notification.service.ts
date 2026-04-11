import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ReservationService } from './reservation.service';
import { Reservation } from '../../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  readonly newBookingCount$ = new BehaviorSubject<number>(0);
  readonly newBooking$ = new BehaviorSubject<Reservation | null>(null);

  private knownIds = new Set<string>();
  private seeded = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;

  constructor(private reservationService: ReservationService) {}

  startPolling(intervalMs = 30_000): void {
    if (this.intervalHandle !== null) return;
    this.checkForNewBookings();
    this.intervalHandle = setInterval(() => this.checkForNewBookings(), intervalMs);
  }

  stopPolling(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.seeded = false;
    this.knownIds.clear();
  }

  async requestPermission(): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  clearNewBookings(): void {
    this.newBookingCount$.next(0);
  }

  checkForNewBookings(): void {
    this.reservationService.getReservations('pending').subscribe({
      next: (reservations) => {
        if (!this.seeded) {
          reservations.forEach((r) => this.knownIds.add(r._id));
          this.seeded = true;
          return;
        }
        const newOnes = reservations.filter((r) => !this.knownIds.has(r._id));
        newOnes.forEach((r) => {
          this.knownIds.add(r._id);
          this.triggerNotification(r);
        });
      },
      error: () => {
        // Silent failure — polling errors must never surface to the UI
      },
    });
  }

  triggerNotification(reservation: Reservation): void {
    this.newBookingCount$.next(this.newBookingCount$.getValue() + 1);
    this.newBooking$.next(reservation);
    this.playNotificationSound();
    this.showBrowserNotification(reservation);
  }

  private showBrowserNotification(reservation: Reservation): void {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const title = '🎾 New Booking — RC Tennis';
    const body =
      `${reservation.playerName}\n` +
      `${reservation.ReserveDate}  ${reservation.StartTime}–${reservation.EndTime}\n` +
      `Court: ${reservation.courtId}`;

    const notification = new Notification(title, {
      body,
      icon: '/RCTennis.webp',
      tag: reservation._id,
      requireInteraction: false,
    });

    setTimeout(() => notification.close(), 8_000);
  }

  playNotificationSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.scheduleChime(this.audioCtx, 523.25, 0.00);  // C5
      this.scheduleChime(this.audioCtx, 659.25, 0.18);  // E5
    } catch {
      // Web Audio API unavailable — notification still fires visually
    }
  }

  private scheduleChime(ctx: AudioContext, freq: number, delay: number): void {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = freq;

    const start = ctx.currentTime + delay;
    const peak  = start + 0.015;
    const end   = start + 0.55;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.35, peak);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.start(start);
    osc.stop(end);

    osc.addEventListener('ended', () => {
      osc.disconnect();
      gain.disconnect();
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.audioCtx?.close();
  }
}
