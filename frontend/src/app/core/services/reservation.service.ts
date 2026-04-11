import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reservation, ReservationStatus } from '../../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly apiUrl = '/api/reservations';

  constructor(private http: HttpClient) {}

  createReservation(data: {
    playerId: string;
    courtId: string;
    ReserveDate: string;
    StartTime: string;
    EndTime: string;
    paymentMade: boolean;
    paymentMethod: string;
    paymentAmount: number | null;
    paymentReference: string;
  }): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, data);
  }

  getReservations(status?: ReservationStatus, paymentMade?: boolean): Observable<Reservation[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (paymentMade !== undefined) params = params.set('paymentMade', String(paymentMade));
    return this.http.get<Reservation[]>(this.apiUrl, { params });
  }

  approveReservation(id: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectReservation(id: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.apiUrl}/${id}/reject`, {});
  }

  getPublicSchedule(month: string): Observable<Reservation[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<Reservation[]>(`${this.apiUrl}/schedule`, { params });
  }
}
