import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import flatpickr from 'flatpickr';
import { BlockedSlotService } from '../../../../core/services/blocked-slot.service';
import { BlockedSlot } from '../../../../models/blocked-slot.model';

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
  @ViewChild('blockDateInput') dateInputRef!: ElementRef;

  slots: BlockedSlot[] = [];
  loading = false;
  errorMessage = '';

  showForm = false;
  form = { courtId: 'Court1', ReserveDate: '', StartTime: '', EndTime: '', reason: '' };
  customReason = '';
  formError = '';
  formLoading = false;

  timeSlots = TIME_SLOTS;
  reasonPresets = REASON_PRESETS;
  deleteLoading: Record<string, boolean> = {};

  private datePicker: any;

  constructor(private service: BlockedSlotService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }

  ngAfterViewInit(): void { this.initDatePicker(); }

  ngOnDestroy(): void { this.datePicker?.destroy(); }

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
    this.form = { courtId: 'Court1', ReserveDate: '', StartTime: '', EndTime: '', reason: '' };
    this.customReason = '';
    this.formError = '';
    setTimeout(() => this.initDatePicker(), 0);
  }

  cancelForm(): void { this.showForm = false; }

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

  deleteSlot(id: string): void {
    if (!confirm('Remove this blocked slot?')) return;
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

  formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
  }
}
