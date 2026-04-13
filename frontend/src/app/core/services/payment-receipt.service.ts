import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentReceipt, PaymentReceiptReport } from '../../models/payment-receipt.model';

export interface CreateReceiptPayload {
  playerName: string;
  reason: string;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  baseAmount: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentReceiptService {
  private readonly apiUrl = '/api/payment-receipts';

  constructor(private http: HttpClient) {}

  createReceipt(payload: CreateReceiptPayload): Observable<PaymentReceipt> {
    return this.http.post<PaymentReceipt>(this.apiUrl, payload);
  }

  getReceipts(filters?: { from?: string; to?: string; paymentMethod?: string; reason?: string }): Observable<PaymentReceipt[]> {
    let params = new HttpParams();
    if (filters?.from)          params = params.set('from', filters.from);
    if (filters?.to)            params = params.set('to', filters.to);
    if (filters?.paymentMethod) params = params.set('paymentMethod', filters.paymentMethod);
    if (filters?.reason)        params = params.set('reason', filters.reason);
    return this.http.get<PaymentReceipt[]>(this.apiUrl, { params });
  }

  getReport(filters?: { from?: string; to?: string }): Observable<PaymentReceiptReport> {
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to)   params = params.set('to', filters.to);
    return this.http.get<PaymentReceiptReport>(`${this.apiUrl}/report`, { params });
  }

  deleteReceipt(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  recordServiceChargePayment(payload: {
    amount: number;
    paidAt: string;
    paidTo: string;
    paymentMethod: string;
    accountNumber?: string;
    referenceNumber?: string;
    notes?: string;
  }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sc-payments`, payload);
  }
}
