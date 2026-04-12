import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReservationService } from '../../core/services/reservation.service';
import { BlockedSlotService } from '../../core/services/blocked-slot.service';
import { Reservation } from '../../models/reservation.model';
import { BlockedSlot } from '../../models/blocked-slot.model';

interface CalendarDay {
  date: string;
  day: number;
  bookings: Reservation[];
  blocked: BlockedSlot[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

@Component({
  selector: 'app-schedule',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit {
  activeTab: 'calendar' | 'list' = 'calendar';
  selectedPlayer = '';

  weeks: CalendarDay[][] = [];
  monthLabel = '';
  selectedDay: CalendarDay | null = null;
  loading = false;
  errorMessage = '';

  private currentYear = new Date().getFullYear();
  private currentMonth = new Date().getMonth();
  private bookings: Reservation[] = [];
  private blockedSlots: BlockedSlot[] = [];

  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(
    private reservationService: ReservationService,
    private blockedSlotService: BlockedSlotService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadMonth();
  }

  prevMonth(): void {
    this.currentMonth === 0 ? ((this.currentMonth = 11), this.currentYear--) : this.currentMonth--;
    this.selectedDay = null;
    this.loadMonth();
  }

  nextMonth(): void {
    this.currentMonth === 11 ? ((this.currentMonth = 0), this.currentYear++) : this.currentMonth++;
    this.selectedDay = null;
    this.loadMonth();
  }

  selectDay(day: CalendarDay): void {
    if (!day.day) return;
    this.selectedDay = this.selectedDay?.date === day.date ? null : day;
  }

  private loadMonth(): void {
    this.loading = true;
    this.errorMessage = '';
    const monthStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;

    forkJoin({
      bookings: this.reservationService.getPublicSchedule(monthStr),
      blocked: this.blockedSlotService.getPublicBlockedSlots(monthStr),
    }).subscribe({
      next: ({ bookings, blocked }) => {
        this.bookings = bookings;
        this.blockedSlots = blocked;
        this.buildCalendar();
        this.loading = false;
        const today = this.localDateStr();
        const todayCell = this.weeks.flat().find((d) => d.date === today);
        if (todayCell) this.selectedDay = todayCell;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load schedule.';
        this.cdr.detectChanges();
      },
    });
  }

  private buildCalendar(): void {
    const year = this.currentYear;
    const month = this.currentMonth;
    const today = this.localDateStr();

    this.monthLabel = new Date(year, month, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const bookingMap: Record<string, Reservation[]> = {};
    for (const b of this.bookings) {
      if (!bookingMap[b.ReserveDate]) bookingMap[b.ReserveDate] = [];
      bookingMap[b.ReserveDate].push(b);
    }

    const blockedMap: Record<string, BlockedSlot[]> = {};
    for (const s of this.blockedSlots) {
      if (!blockedMap[s.ReserveDate]) blockedMap[s.ReserveDate] = [];
      blockedMap[s.ReserveDate].push(s);
    }

    const days: CalendarDay[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({
        date: '',
        day: 0,
        bookings: [],
        blocked: [],
        isToday: false,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        day: d,
        bookings: bookingMap[dateStr] || [],
        blocked: blockedMap[dateStr] || [],
        isToday: dateStr === today,
        isCurrentMonth: true,
      });
    }

    while (days.length % 7 !== 0) {
      days.push({
        date: '',
        day: 0,
        bookings: [],
        blocked: [],
        isToday: false,
        isCurrentMonth: false,
      });
    }

    this.weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      this.weeks.push(days.slice(i, i + 7));
    }
  }

  get playerNames(): string[] {
    const names = this.bookings.map(b => b.playerName);
    return [...new Set(names)].sort();
  }

  get allDays(): CalendarDay[] {
    const today = this.localDateStr();
    const days = this.weeks.flat().filter(d => d.day && d.date >= today && (d.bookings.length > 0 || d.blocked.length > 0));
    if (!this.selectedPlayer) return days;
    if (this.selectedPlayer === '__blocked__') {
      return days
        .map(d => ({ ...d, bookings: [] }))
        .filter(d => d.blocked.length > 0);
    }
    return days
      .map(d => ({
        ...d,
        bookings: d.bookings.filter(b => b.playerName === this.selectedPlayer),
        blocked: [],
      }))
      .filter(d => d.bookings.length > 0);
  }

  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  private localDateStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
  }
}
