export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PaymentMethod = 'maya' | 'gcash' | 'bank_transfer_maybank' | 'cash';

export interface Reservation {
  _id: string;
  playerId: string;
  playerName: string;
  courtId: string;
  ReserveDate: string;   // "YYYY-MM-DD"
  StartTime: string;     // "HH:MM"
  EndTime: string;       // "HH:MM"
  status: ReservationStatus;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paymentMade?: boolean;
  paymentMethod?: PaymentMethod | null;
  paymentAmount?: number | null;
  paymentReference?: string | null;
}
