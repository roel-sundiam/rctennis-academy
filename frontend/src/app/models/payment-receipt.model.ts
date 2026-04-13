export type PaymentMethod = 'maya' | 'gcash' | 'bank_transfer_maybank' | 'cash';

export const RECEIPT_REASONS = [
  'Court Fee',
  'Training Fee',
  'Tournament Entry Fee',
  'Coaching Fee',
  'Equipment Rental',
  'Membership Fee',
  'Guest Fee',
  'Ball Purchase',
  'Locker Rental',
  'Other',
] as const;

export type ReceiptReason = typeof RECEIPT_REASONS[number];

export interface PaymentReceipt {
  _id: string;
  receiptNumber: string;
  playerName: string;
  reason: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string | null;
  baseAmount: number;
  serviceCharge: number;
  totalAmount: number;
  issuedBy: string;
  notes?: string | null;
  createdAt: string;
}

export interface ScPaymentEntry {
  _id: string;
  amount: number;
  paidAt: string;
  paidBy: string;
  paidTo: string;
  paymentMethod: string;
  accountNumber?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface PaymentReceiptReport {
  summary: {
    totalReceipts: number;
    totalBaseAmount: number;
    totalServiceCharge: number;
    totalAmount: number;
  };
  byMethod: Array<{
    _id: PaymentMethod;
    count: number;
    totalBaseAmount: number;
    totalServiceCharge: number;
    totalAmount: number;
  }>;
  byReason: Array<{
    _id: string;
    count: number;
    totalBaseAmount: number;
    totalServiceCharge: number;
    totalAmount: number;
  }>;
  scLedger: {
    totalOwed: number;
    totalPaid: number;
    balance: number;
    payments: ScPaymentEntry[];
  };
  serviceChargeRate: number;
}
