import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import flatpickr from 'flatpickr';
import { BlockedSlotService } from '../../../../core/services/blocked-slot.service';
import { BlockedSlot, CreateRecurringBlockedSlotDto } from '../../../../models/blocked-slot.model';
import { ModalService } from '../../../../core/services/modal.service';
import { PlayerService } from '../../../../core/services/player.service';
import { Player } from '../../../../models/player.model';

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

const REASON_PRESETS = [
  'Private Event', 'Client Training', 'Court Maintenance',
  'Club Tournament', 'Coaching Session', 'Other'
];

@Component({
  selector: 'app-blocked-slots-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './blocked-slots-panel.component.html',
  styleUrl: './blocked-slots-panel.component.scss'
})
export class BlockedSlotsPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('blockDateInput')  dateInputRef!:       ElementRef;
  @ViewChild('rangeStartInput') rangeStartRef!:      ElementRef;
  @ViewChild('rangeEndInput')   rangeEndRef!:        ElementRef;

  slots: BlockedSlot[] = [];
  loading = false;
  errorMessage = '';

  showForm = false;
  mode: 'one-time' | 'recurring' = 'one-time';

  // One-time form
  form = { courtId: 'Court1', ReserveDate: '', StartTime: '', EndTime: '', reason: '' };
  customReason = '';

  // Recurring form
  recurringForm = { courtId: 'Court1', dayOfWeek: 3, rangeStart: '', rangeEnd: '', StartTime: '', EndTime: '', reason: '', playerName: '' };
  customReasonRecurring = '';

  players: Player[] = [];

  formError = '';
  formLoading = false;

  timeSlots = TIME_SLOTS;
  reasonPresets = REASON_PRESETS;
  deleteLoading: Record<string, boolean> = {};
  deleteGroupLoading: Record<string, boolean> = {};

  readonly DAYS_OF_WEEK = [
    { label: 'Sunday',    value: 0 },
    { label: 'Monday',    value: 1 },
    { label: 'Tuesday',   value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday',  value: 4 },
    { label: 'Friday',    value: 5 },
    { label: 'Saturday',  value: 6 },
  ];

  private datePicker: any;
  private rangeStartPicker: any;
  private rangeEndPicker: any;

  constructor(
    private service: BlockedSlotService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef,
    private playerService: PlayerService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.playerService.getActivePlayers().subscribe({
      next: players => { this.players = players; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  ngAfterViewInit(): void { this.initDatePicker(); }

  ngOnDestroy(): void {
    this.datePicker?.destroy();
    this.rangeStartPicker?.destroy();
    this.rangeEndPicker?.destroy();
  }

  private initDatePicker(): void {
    if (!this.dateInputRef) return;
    this.datePicker = flatpickr(this.dateInputRef.nativeElement, {
      minDate: 'today',
      dateFormat: 'Y-m-d',
      disableMobile: false,
      onChange: (_: Date[], dateStr: string) => {
        this.form.ReserveDate = dateStr;
        this.cdr.detectChanges();
      }
    });
  }

  load(): void {
    this.loading = true;
    this.service.getAllBlockedSlots().subscribe({
      next: slots => { this.slots = slots; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.errorMessage = 'Failed to load blocked slots.'; this.cdr.detectChanges(); }
    });
  }

  openForm(): void {
    this.showForm = true;
    this.mode = 'one-time';
    this.form = { courtId: 'Court1', ReserveDate: '', StartTime: '', EndTime: '', reason: '' };
    this.customReason = '';
    this.recurringForm = { courtId: 'Court1', dayOfWeek: 3, rangeStart: '', rangeEnd: '', StartTime: '', EndTime: '', reason: '', playerName: '' };
    this.customReasonRecurring = '';
    this.formError = '';
    setTimeout(() => this.initDatePicker(), 0);
  }

  cancelForm(): void { this.showForm = false; }

  switchMode(m: 'one-time' | 'recurring'): void {
    this.mode = m;
    this.formError = '';
    setTimeout(() => {
      if (m === 'one-time') this.initDatePicker();
      else this.initRangePickers();
      this.cdr.detectChanges();
    }, 0);
  }

  private initRangePickers(): void {
    if (this.rangeStartRef) {
      this.rangeStartPicker?.destroy();
      this.rangeStartPicker = flatpickr(this.rangeStartRef.nativeElement, {
        minDate: 'today',
        dateFormat: 'Y-m-d',
        disableMobile: false,
        onChange: (_: Date[], dateStr: string) => {
          this.recurringForm.rangeStart = dateStr;
          this.rangeEndPicker?.set('minDate', dateStr || 'today');
          this.cdr.detectChanges();
        }
      });
    }
    if (this.rangeEndRef) {
      this.rangeEndPicker?.destroy();
      this.rangeEndPicker = flatpickr(this.rangeEndRef.nativeElement, {
        minDate: 'today',
        dateFormat: 'Y-m-d',
        disableMobile: false,
        onChange: (_: Date[], dateStr: string) => {
          this.recurringForm.rangeEnd = dateStr;
          this.cdr.detectChanges();
        }
      });
    }
  }

  selectStartTime(time: string): void {
    this.form.StartTime = time;
    if (this.form.EndTime && this.form.EndTime <= time) this.form.EndTime = '';
  }

  selectEndTime(time: string): void { this.form.EndTime = time; }

  get endTimeSlots(): string[] {
    return this.form.StartTime ? this.timeSlots.filter(t => t > this.form.StartTime) : [];
  }

  selectReason(r: string): void {
    this.form.reason = r;
    if (r !== 'Other') this.customReason = '';
  }

  selectRecurringStartTime(time: string): void {
    this.recurringForm.StartTime = time;
    if (this.recurringForm.EndTime && this.recurringForm.EndTime <= time) this.recurringForm.EndTime = '';
  }

  selectRecurringEndTime(time: string): void { this.recurringForm.EndTime = time; }

  selectRecurringReason(r: string): void {
    this.recurringForm.reason = r;
    if (r !== 'Other') this.customReasonRecurring = '';
  }

  get recurringEndTimeSlots(): string[] {
    return this.recurringForm.StartTime ? this.timeSlots.filter(t => t > this.recurringForm.StartTime) : [];
  }

  /** Groups recurring slots by recurringGroupId; one-time slots each appear as { groupId: null }. */
  get groupedSlotView(): Array<{ groupId: string | null; slots: BlockedSlot[] }> {
    const groups = new Map<string, BlockedSlot[]>();
    const singles: BlockedSlot[] = [];

    for (const slot of this.slots) {
      if (slot.isRecurring && slot.recurringGroupId) {
        if (!groups.has(slot.recurringGroupId)) groups.set(slot.recurringGroupId, []);
        groups.get(slot.recurringGroupId)!.push(slot);
      } else {
        singles.push(slot);
      }
    }

    const result: Array<{ groupId: string | null; slots: BlockedSlot[] }> = [];
    groups.forEach((slots, groupId) => {
      const sorted = [...slots].sort((a, b) => a.ReserveDate.localeCompare(b.ReserveDate));
      result.push({ groupId, slots: sorted });
    });
    singles.forEach(s => result.push({ groupId: null, slots: [s] }));
    return result;
  }

  submitForm(): void {
    const reason = this.form.reason === 'Other' ? this.customReason.trim() : this.form.reason;
    if (!this.form.ReserveDate || !this.form.StartTime || !this.form.EndTime || !reason) {
      this.formError = 'Please fill in all fields.';
      return;
    }
    this.formLoading = true;
    this.formError = '';
    this.service.createBlockedSlot({ ...this.form, reason }).subscribe({
      next: slot => {
        this.slots.unshift(slot);
        this.showForm = false;
        this.formLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.formLoading = false;
        this.formError = err.error?.message || 'Failed to block slot.';
        this.cdr.detectChanges();
      }
    });
  }

  submitRecurringForm(): void {
    const reason = this.recurringForm.reason === 'Other'
      ? this.customReasonRecurring.trim()
      : this.recurringForm.reason;

    if (!this.recurringForm.playerName || !this.recurringForm.rangeStart || !this.recurringForm.rangeEnd ||
        !this.recurringForm.StartTime  || !this.recurringForm.EndTime  || !reason) {
      this.formError = 'Please fill in all fields.';
      return;
    }

    this.formLoading = true;
    this.formError = '';

    const payload: CreateRecurringBlockedSlotDto = {
      courtId:    this.recurringForm.courtId,
      dayOfWeek:  this.recurringForm.dayOfWeek,
      rangeStart: this.recurringForm.rangeStart,
      rangeEnd:   this.recurringForm.rangeEnd,
      StartTime:  this.recurringForm.StartTime,
      EndTime:    this.recurringForm.EndTime,
      reason,
      playerName: this.recurringForm.playerName
    };

    this.service.createRecurringBlockedSlots(payload).subscribe({
      next: resp => {
        this.slots = [...resp.slots, ...this.slots];
        this.showForm = false;
        this.formLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.formLoading = false;
        this.formError = err.error?.message || 'Failed to create recurring blocks.';
        this.cdr.detectChanges();
      }
    });
  }

  async deleteSlot(id: string): Promise<void> {
    const confirmed = await this.modalService.open({
      type: 'danger',
      title: 'Remove Blocked Slot',
      message: 'Are you sure you want to remove this blocked slot?',
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;
    this.deleteLoading[id] = true;
    this.service.deleteBlockedSlot(id).subscribe({
      next: () => {
        this.slots = this.slots.filter(s => s._id !== id);
        this.deleteLoading[id] = false;
        this.cdr.detectChanges();
      },
      error: () => { this.deleteLoading[id] = false; this.cdr.detectChanges(); }
    });
  }

  async deleteGroup(groupId: string): Promise<void> {
    const confirmed = await this.modalService.open({
      type: 'danger',
      title: 'Remove Entire Series',
      message: 'This will delete all occurrences in this recurring series. Continue?',
      confirmLabel: 'Delete All',
    });
    if (!confirmed) return;
    this.deleteGroupLoading[groupId] = true;
    this.service.deleteBlockedSlotGroup(groupId).subscribe({
      next: () => {
        this.slots = this.slots.filter(s => s.recurringGroupId !== groupId);
        this.deleteGroupLoading[groupId] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.deleteGroupLoading[groupId] = false;
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
}
