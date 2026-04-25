import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../../models/player.model';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly apiUrl = '/api/players';

  constructor(private http: HttpClient) {}

  getActivePlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(this.apiUrl);
  }

  getAllPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.apiUrl}/all`);
  }

  createPlayer(data: { name: string; contactNumber?: string }): Observable<Player> {
    return this.http.post<Player>(this.apiUrl, data);
  }

  updatePlayer(id: string, data: { name: string; contactNumber?: string }): Observable<Player> {
    return this.http.put<Player>(`${this.apiUrl}/${id}`, data);
  }

  deletePlayer(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  registerPlayer(data: { name: string; contactNumber?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/register`, data);
  }

  approvePlayer(id: string): Observable<Player> {
    return this.http.patch<Player>(`${this.apiUrl}/${id}/approve`, {});
  }
}
