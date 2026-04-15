import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  menuOpen = false;
  tournaments = signal<any[]>([]);
  tournamentsLoading = signal(true);
  tournamentsError = signal(false);
  googleReviewsUrl = 'https://www.google.com/search?rlz=1C1GCEU_enPH1137PH1137&sca_esv=81ef8ac98c35c5fb&sxsrf=ANbL-n6Xsp9tWulvEuv0PIqQrMnOMmA1IQ:1776140980483&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOXgy2cKWGEU__WWUCo1-CNtKD9qPhm7syJ3Aw4jGuB9BYjdjtFtiQ5Y8BjnZp-qI_cR626uiIfuUzrjjKSqJu-A_Jbn-5mYWBxq5btawJs_ibYdz-uqm7V4krq6qYEgVYH8bp0kmiI1Fglev4N9_gWnT8Zyd&q=Renell+Crescini+Tennis+Camp-Angeles+City-RC+TENNIS+CAMP+Reviews&sa=X&ved=2ahUKEwjhxtnhwOyTAxXuUGwGHehHKhsQ0bkNegQIRRAF&biw=1707&bih=932&dpr=1.5';

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.http.get<any[]>('/api/tournaments').pipe(timeout(15000)).subscribe({
      next: data => {
        this.tournaments.set(data);
        this.tournamentsLoading.set(false);
      },
      error: () => {
        this.tournamentsLoading.set(false);
        this.tournamentsError.set(true);
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
