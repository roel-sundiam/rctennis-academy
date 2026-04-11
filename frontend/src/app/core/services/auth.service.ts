import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

const TOKEN_KEY = 'rctennis_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private loggedIn$ = new BehaviorSubject<boolean>(this.hasValidToken());

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.loggedIn$.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.loggedIn$.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.hasValidToken();
  }

  isLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  getRole(): string | null {
    return this.decodePayload()?.role ?? null;
  }

  getUsername(): string | null {
    return this.decodePayload()?.username ?? null;
  }

  isSuperAdmin(): boolean {
    return this.getRole() === 'superadmin';
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/change-password`, { currentPassword, newPassword });
  }

  private decodePayload(): { role: string; username: string; exp: number } | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private hasValidToken(): boolean {
    const payload = this.decodePayload();
    return !!payload && payload.exp * 1000 > Date.now();
  }
}
