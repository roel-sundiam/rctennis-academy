import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ReservationService } from './reservation.service';
import { PlayerService } from './player.service';
import { Reservation } from '../../models/reservation.model';
import { Player } from '../../models/player.model';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  readonly newBookingCount$ = new BehaviorSubject<number>(0);
  readonly newBooking$ = new BehaviorSubject<Reservation | null>(null);
  readonly pendingPlayerCount$ = new BehaviorSubject<number>(0);
  readonly newPlayer$ = new BehaviorSubject<Player | null>(null);

  private knownIds = new Set<string>();
  private seeded = false;
  private knownPlayerIds = new Set<string>();
  private playerSeeded = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;

  constructor(
    private reservationService: ReservationService,
    private playerService: PlayerService,
  ) {}

  startPolling(intervalMs = 30_000): void {
    if (this.intervalHandle !== null) return;
    this.checkForNewBookings();
    this.checkForNewPlayers();
    this.intervalHandle = setInterval(() => {
      this.checkForNewBookings();
      this.checkForNewPlayers();
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.seeded = false;
    this.knownIds.clear();
    this.playerSeeded = false;
    this.knownPlayerIds.clear();
    this.pendingPlayerCount$.next(0);
  }

  async requestPermission(): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  clearNewBookings(): void {
    this.newBookingCount$.next(0);
    this.updateAppBadge(this.pendingPlayerCount$.getValue());
  }

  checkForNewBookings(): void {
    this.reservationService.getReservations('pending').subscribe({
      next: (reservations) => {
        this.newBookingCount$.next(reservations.length);
        this.updateAppBadge(reservations.length + this.pendingPlayerCount$.getValue());

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
      error: () => {},
    });
  }

  checkForNewPlayers(): void {
    this.playerService.getAllPlayers().subscribe({
      next: (players) => {
        const pending = players.filter((p) => p.registrationStatus === 'pending');
        this.pendingPlayerCount$.next(pending.length);
        this.updateAppBadge(this.newBookingCount$.getValue() + pending.length);

        if (!this.playerSeeded) {
          pending.forEach((p) => this.knownPlayerIds.add(p._id));
          this.playerSeeded = true;
          return;
        }
        const newOnes = pending.filter((p) => !this.knownPlayerIds.has(p._id));
        newOnes.forEach((p) => {
          this.knownPlayerIds.add(p._id);
          this.triggerPlayerNotification(p);
        });
      },
      error: () => {},
    });
  }

  triggerNotification(reservation: Reservation): void {
    this.newBooking$.next(reservation);
    this.playNotificationSound();
    this.showViaServiceWorker('🎾 New Booking — RC Tennis', {
      body:
        `${reservation.playerName}\n` +
        `${reservation.ReserveDate}  ${reservation.StartTime}–${reservation.EndTime}\n` +
        `Court: ${reservation.courtId}`,
      icon: '/RCTennis.webp',
      tag: reservation._id,
      requireInteraction: false,
    });
  }

  triggerPlayerNotification(player: Player): void {
    this.newPlayer$.next(player);
    this.playNotificationSound();
    this.showViaServiceWorker('👤 New Player Registration — RC Tennis', {
      body: `${player.name}\nAwaiting approval`,
      icon: '/RCTennis.webp',
      tag: `player-${player._id}`,
      requireInteraction: false,
    });
  }

  private async showViaServiceWorker(title: string, options: NotificationOptions): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, options);
    } catch {
      // Silent fallback — notification fires visually if SW unavailable
    }
  }

  private updateAppBadge(total: number): void {
    if (!('setAppBadge' in navigator)) return;
    if (total > 0) {
      (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(total);
    } else {
      (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
  }

  playNotificationSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.scheduleChime(this.audioCtx, 523.25, 0.00); // C5
      this.scheduleChime(this.audioCtx, 659.25, 0.18); // E5
    } catch {
      // Web Audio API unavailable — notification still fires visually
    }
  }

  private scheduleChime(ctx: AudioContext, freq: number, delay: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = freq;

    const start = ctx.currentTime + delay;
    const peak = start + 0.015;
    const end = start + 0.55;

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
