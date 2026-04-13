import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  menuOpen = false;
  tournaments: any[] = [];
  tournamentsLoading = true;

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.http.get<any[]>('/api/tournaments').subscribe({
      next: data => {
        this.tournaments = data;
        this.tournamentsLoading = false;
      },
      error: () => {
        this.tournamentsLoading = false;
      }
    });
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  goToAdmin(): void {
    this.router.navigate([this.auth.isLoggedIn() ? '/admin' : '/admin/login']);
  }
}
