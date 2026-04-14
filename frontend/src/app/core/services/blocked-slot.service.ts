import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BlockedSlot, CreateRecurringBlockedSlotDto, RecurringCreateResponse } from '../../models/blocked-slot.model';

@Injectable({ providedIn: 'root' })
export class BlockedSlotService {
  private readonly apiUrl = '/api/blocked-slots';

  constructor(private http: HttpClient) {}

  getPublicBlockedSlots(month: string): Observable<BlockedSlot[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<BlockedSlot[]>(`${this.apiUrl}/public`, { params });
  }

  getAllBlockedSlots(): Observable<BlockedSlot[]> {
    return this.http.get<BlockedSlot[]>(this.apiUrl);
  }

  createBlockedSlot(data: {
    courtId: string;
    ReserveDate: string;
    StartTime: string;
    EndTime: string;
    reason: string;
  }): Observable<BlockedSlot> {
    return this.http.post<BlockedSlot>(this.apiUrl, data);
  }

  deleteBlockedSlot(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  createRecurringBlockedSlots(data: CreateRecurringBlockedSlotDto): Observable<RecurringCreateResponse> {
    return this.http.post<RecurringCreateResponse>(`${this.apiUrl}/recurring`, data);
  }

  deleteBlockedSlotGroup(groupId: string): Observable<{ message: string; deletedCount: number }> {
    return this.http.delete<{ message: string; deletedCount: number }>(`${this.apiUrl}/group/${groupId}`);
  }
}
