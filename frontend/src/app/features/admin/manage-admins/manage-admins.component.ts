import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

export interface AdminEntry {
  username: string;
  role: 'admin' | 'superadmin';
  source: 'env' | 'db';
  createdBy?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-manage-admins',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './manage-admins.component.html',
  styleUrl: './manage-admins.component.scss'
})
export class ManageAdminsComponent implements OnInit {
  admins: AdminEntry[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  newUsername = '';
  newPassword = '';
  newRole: 'admin' | 'superadmin' = 'admin';
  submitting = false;
  formError = '';

  deletingUsername: string | null = null;
  confirmDeleteUsername = '';

  username: string | null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.username = this.authService.getUsername();
  }

  ngOnInit(): void {
    this.loadAdmins();
  }

  private readonly apiUrl = '/api/auth';

  loadAdmins(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<AdminEntry[]>(`${this.apiUrl}/admins`).subscribe({
      next: data => {
        this.admins = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load admin accounts.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  addAdmin(): void {
    this.formError = '';
    this.successMessage = '';

    if (!this.newUsername.trim() || !this.newPassword) {
      this.formError = 'Username and password are required.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.formError = 'Password must be at least 8 characters.';
      return;
    }

    this.submitting = true;
    this.http.post<AdminEntry>(`${this.apiUrl}/admins`, {
      username: this.newUsername.trim(),
      password: this.newPassword,
      role: this.newRole
    }).subscribe({
      next: created => {
        this.admins = [...this.admins, created];
        this.newUsername = '';
        this.newPassword = '';
        this.newRole = 'admin';
        this.submitting = false;
        this.successMessage = `Admin "${created.username}" added successfully.`;
        this.cdr.detectChanges();
      },
      error: err => {
        this.formError = err.error?.message || 'Failed to add admin.';
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  startDelete(username: string): void {
    this.deletingUsername = username;
    this.confirmDeleteUsername = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  cancelDelete(): void {
    this.deletingUsername = null;
    this.confirmDeleteUsername = '';
  }

  confirmDelete(): void {
    if (!this.deletingUsername) return;
    const username = this.deletingUsername;

    this.http.delete(`${this.apiUrl}/admins/${encodeURIComponent(username)}`).subscribe({
      next: () => {
        this.admins = this.admins.filter(a => a.username !== username);
        this.deletingUsername = null;
        this.confirmDeleteUsername = '';
        this.successMessage = `Admin "${username}" removed.`;
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Failed to delete admin.';
        this.deletingUsername = null;
        this.confirmDeleteUsername = '';
        this.cdr.detectChanges();
      }
    });
  }
}
