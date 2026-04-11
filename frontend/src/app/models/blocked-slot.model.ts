export interface BlockedSlot {
  _id: string;
  courtId: string;
  ReserveDate: string;
  StartTime: string;
  EndTime: string;
  reason: string;
  createdBy?: string;
  createdAt?: string;
}
