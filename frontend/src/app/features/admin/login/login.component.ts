import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  form = { username: '', password: '' };
  submitting = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  submit(): void {
    this.errorMessage.set('');
    if (!this.form.username || !this.form.password) {
      this.errorMessage.set('Please enter your username and password.');
      return;
    }
    this.submitting.set(true);
    this.auth.login(this.form.username, this.form.password).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Invalid credentials. Please try again.');
      },
    });
  }
}
