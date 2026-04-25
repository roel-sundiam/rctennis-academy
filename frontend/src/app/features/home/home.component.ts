import { Component, OnInit, AfterViewInit, signal, inject, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { timeout, take } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PlayerService } from '../../core/services/player.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit {
  menuOpen = false;
  tournaments = signal<any[]>([]);
  tournamentsLoading = signal(true);
  tournamentsError = signal(false);
  googleReviewsUrl = 'https://www.google.com/search?rlz=1C1GCEU_enPH1137PH1137&sca_esv=81ef8ac98c35c5fb&sxsrf=ANbL-n6Xsp9tWulvEuv0PIqQrMnOMmA1IQ:1776140980483&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOXgy2cKWGEU__WWUCo1-CNtKD9qPhm7syJ3Aw4jGuB9BYjdjtFtiQ5Y8BjnZp-qI_cR626uiIfuUzrjjKSqJu-A_Jbn-5mYWBxq5btawJs_ibYdz-uqm7V4krq6qYEgVYH8bp0kmiI1Fglev4N9_gWnT8Zyd&q=Renell+Crescini+Tennis+Camp-Angeles+City-RC+TENNIS+CAMP+Reviews&sa=X&ved=2ahUKEwjhxtnhwOyTAxXuUGwGHehHKhsQ0bkNegQIRRAF&biw=1707&bih=932&dpr=1.5';

  showRegisterModal = signal(false);
  registerForm = { name: '', contactNumber: '' };
  registerLoading = signal(false);
  registerError = signal('');
  registerSuccess = signal(false);

  private route = inject(ActivatedRoute);
  private doc = inject(DOCUMENT);

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private playerService: PlayerService,
  ) {}

  ngAfterViewInit(): void {
    this.route.fragment.pipe(take(1)).subscribe(fragment => {
      if (fragment) {
        setTimeout(() => {
          this.doc.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    });
  }

  ngOnInit(): void {
    this.http.get<any[]>('/api/tournaments').pipe(timeout(15000)).subscribe({
      next: data => {
        const today = new Date().toISOString().slice(0, 10);
        this.tournaments.set(data.filter((t: any) => t.endDate >= today));
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

  openRegisterModal(): void {
    this.registerForm = { name: '', contactNumber: '' };
    this.registerError.set('');
    this.registerSuccess.set(false);
    this.showRegisterModal.set(true);
    this.closeMenu();
  }

  closeRegisterModal(): void {
    this.showRegisterModal.set(false);
  }

  submitRegister(): void {
    if (!this.registerForm.name.trim()) {
      this.registerError.set('Name is required.');
      return;
    }
    this.registerLoading.set(true);
    this.registerError.set('');
    this.playerService.registerPlayer(this.registerForm).subscribe({
      next: () => {
        this.registerLoading.set(false);
        this.registerSuccess.set(true);
      },
      error: err => {
        this.registerLoading.set(false);
        this.registerError.set(err.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
