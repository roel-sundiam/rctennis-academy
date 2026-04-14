export interface BlockedSlot {
  _id: string;
  courtId: string;
  ReserveDate: string;
  StartTime: string;
  EndTime: string;
  reason: string;
  playerName?: string;
  createdBy?: string;
  createdAt?: string;
  isRecurring?: boolean;
  recurringGroupId?: string | null;
}

export interface CreateRecurringBlockedSlotDto {
  courtId: string;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfWeek?: number; // 0=Sun … 6=Sat (only for weekly)
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD
  StartTime: string;
  EndTime: string;
  reason: string;
  playerName: string;
}

export interface RecurringCreateResponse {
  count: number;
  recurringGroupId: string;
  slots: BlockedSlot[];
}
