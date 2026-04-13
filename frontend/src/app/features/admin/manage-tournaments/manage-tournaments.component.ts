import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface TournamentMatch {
  _id: string;
  date: string;
  time: string;
  player1: string;
  player2: string;
  court: string;
  result: string | null;
}

interface Tournament {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  matches: TournamentMatch[];
}

@Component({
  selector: 'app-manage-tournaments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './manage-tournaments.component.html',
  styleUrl: './manage-tournaments.component.scss'
})
export class ManageTournamentsComponent implements OnInit {
  private readonly apiUrl = '/api/tournaments';

  tournaments: Tournament[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  // Tournament form
  newTournament = { name: '', startDate: '', endDate: '', location: '', status: 'upcoming' as const };
  submittingTournament = false;
  tournamentFormError = '';

  // Active tournament for match management
  activeTournament: Tournament | null = null;

  // Match form
  newMatch = { date: '', time: '', player1: '', player2: '', court: 'Court 1', result: '' };
  submittingMatch = false;
  matchFormError = '';

  // Edit match
  editingMatch: TournamentMatch | null = null;
  editMatch = { date: '', time: '', player1: '', player2: '', court: '', result: '' };

  // Delete confirmations
  deletingTournamentId: string | null = null;
  deletingMatchId: string | null = null;

  username: string | null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.username = this.authService.getUsername();
  }

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.loading = true;
    this.http.get<Tournament[]>(this.apiUrl).subscribe({
      next: data => {
        this.tournaments = data;
        if (this.activeTournament) {
          this.activeTournament = data.find(t => t._id === this.activeTournament!._id) ?? null;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load tournaments.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  createTournament(): void {
    this.tournamentFormError = '';
    this.successMessage = '';
    const { name, startDate, endDate, location } = this.newTournament;
    if (!name.trim() || !startDate || !endDate || !location.trim()) {
      this.tournamentFormError = 'All fields are required.';
      return;
    }
    this.submittingTournament = true;
    this.http.post<Tournament>(this.apiUrl, this.newTournament).subscribe({
      next: created => {
        this.tournaments = [...this.tournaments, created];
        this.newTournament = { name: '', startDate: '', endDate: '', location: '', status: 'upcoming' };
        this.successMessage = `Tournament "${created.name}" created.`;
        this.submittingTournament = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.tournamentFormError = err.error?.message || 'Failed to create tournament.';
        this.submittingTournament = false;
        this.cdr.detectChanges();
      }
    });
  }

  startDeleteTournament(id: string): void {
    this.deletingTournamentId = id;
    this.successMessage = '';
    this.errorMessage = '';
  }

  cancelDeleteTournament(): void {
    this.deletingTournamentId = null;
  }

  confirmDeleteTournament(id: string): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.tournaments = this.tournaments.filter(t => t._id !== id);
        if (this.activeTournament?._id === id) this.activeTournament = null;
        this.deletingTournamentId = null;
        this.successMessage = 'Tournament deleted.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Failed to delete tournament.';
        this.deletingTournamentId = null;
        this.cdr.detectChanges();
      }
    });
  }

  selectTournament(t: Tournament): void {
    this.activeTournament = t;
    this.matchFormError = '';
    this.editingMatch = null;
    this.deletingMatchId = null;
    this.newMatch = { date: t.startDate, time: '', player1: '', player2: '', court: 'Court 1', result: '' };
    this.cdr.detectChanges();
  }

  addMatch(): void {
    if (!this.activeTournament) return;
    this.matchFormError = '';
    const { date, time, player1, player2, court } = this.newMatch;
    if (!date || !time || !player1.trim() || !player2.trim() || !court.trim()) {
      this.matchFormError = 'Date, time, both players, and court are required.';
      return;
    }
    this.submittingMatch = true;
    this.http.post<Tournament>(`${this.apiUrl}/${this.activeTournament._id}/matches`, {
      ...this.newMatch,
      result: this.newMatch.result.trim() || null
    }).subscribe({
      next: updated => {
        this.activeTournament = updated;
        this.tournaments = this.tournaments.map(t => t._id === updated._id ? updated : t);
        this.newMatch = { date: updated.startDate, time: '', player1: '', player2: '', court: 'Court 1', result: '' };
        this.submittingMatch = false;
        this.successMessage = 'Match added.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.matchFormError = err.error?.message || 'Failed to add match.';
        this.submittingMatch = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEditMatch(m: TournamentMatch): void {
    this.editingMatch = m;
    this.editMatch = { date: m.date, time: m.time, player1: m.player1, player2: m.player2, court: m.court, result: m.result || '' };
    this.deletingMatchId = null;
  }

  cancelEditMatch(): void {
    this.editingMatch = null;
  }

  saveEditMatch(): void {
    if (!this.activeTournament || !this.editingMatch) return;
    this.http.put<Tournament>(
      `${this.apiUrl}/${this.activeTournament._id}/matches/${this.editingMatch._id}`,
      { ...this.editMatch, result: this.editMatch.result.trim() || null }
    ).subscribe({
      next: updated => {
        this.activeTournament = updated;
        this.tournaments = this.tournaments.map(t => t._id === updated._id ? updated : t);
        this.editingMatch = null;
        this.successMessage = 'Match updated.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.matchFormError = err.error?.message || 'Failed to update match.';
        this.cdr.detectChanges();
      }
    });
  }

  startDeleteMatch(matchId: string): void {
    this.deletingMatchId = matchId;
    this.editingMatch = null;
  }

  cancelDeleteMatch(): void {
    this.deletingMatchId = null;
  }

  confirmDeleteMatch(matchId: string): void {
    if (!this.activeTournament) return;
    this.http.delete<Tournament>(`${this.apiUrl}/${this.activeTournament._id}/matches/${matchId}`).subscribe({
      next: updated => {
        this.activeTournament = updated;
        this.tournaments = this.tournaments.map(t => t._id === updated._id ? updated : t);
        this.deletingMatchId = null;
        this.successMessage = 'Match removed.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Failed to delete match.';
        this.deletingMatchId = null;
        this.cdr.detectChanges();
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
}
