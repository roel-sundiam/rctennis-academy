import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-profile-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profile-panel.component.html',
  styleUrl: './admin-profile-panel.component.scss',
})
export class AdminProfilePanelComponent {
  @Input() username = '';
  @Input() role = '';
  @Output() close = new EventEmitter<void>();

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  successMsg = signal('');
  errorMsg = signal('');
  saving = signal(false);

  private destroyRef = inject(DestroyRef);

  constructor(
    private auth: AuthService,
    private el: ElementRef,
  ) {}

  @HostListener('click', ['$event'])
  onPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.close.emit();
    }
  }

  save(): void {
    this.successMsg.set('');
    this.errorMsg.set('');

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMsg.set('All fields are required.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg.set('New passwords do not match.');
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMsg.set('New password must be at least 8 characters.');
      return;
    }

    this.saving.set(true);
    this.auth
      .changePassword(this.currentPassword, this.newPassword)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.successMsg.set(res.message);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message ?? 'Failed to change password.');
        },
      });
  }

  cancel(): void {
    this.close.emit();
  }
}
