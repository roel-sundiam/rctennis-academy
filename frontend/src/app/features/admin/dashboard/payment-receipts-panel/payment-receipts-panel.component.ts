import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentReceiptService, CreateReceiptPayload } from '../../../../core/services/payment-receipt.service';
import { PaymentReceipt, PaymentReceiptReport, RECEIPT_REASONS } from '../../../../models/payment-receipt.model';
import { PlayerService } from '../../../../core/services/player.service';
import { Player } from '../../../../models/player.model';
import { ModalService } from '../../../../core/services/modal.service';

type PanelView = 'list' | 'new' | 'report';

@Component({
  selector: 'app-payment-receipts-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-receipts-panel.component.html',
  styleUrl: './payment-receipts-panel.component.scss',
})
export class PaymentReceiptsPanelComponent implements OnInit {
  view: PanelView = 'list';

  // ── List ──────────────────────────────────────────────────────────
  receipts: PaymentReceipt[] = [];
  listLoading = false;
  listError = '';
  filterFrom = '';
  filterTo = '';
  filterMethod = '';
  filterReason = '';

  // ── Delete ────────────────────────────────────────────────────────
  async deleteReceipt(receipt: PaymentReceipt): Promise<void> {
    const confirmed = await this.modalService.open({
      type: 'danger',
      title: 'Delete Receipt',
      message: `Delete receipt ${receipt.receiptNumber} for ${receipt.playerName}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    this.receiptService.deleteReceipt(receipt._id).subscribe({
      next: () => {
        this.receipts = this.receipts.filter(r => r._id !== receipt._id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.modalService.open({
          type: 'alert',
          title: 'Error',
          message: err?.error?.message || 'Failed to delete receipt.',
        });
      },
    });
  }

  // ── New Receipt Form ──────────────────────────────────────────────
  form: CreateReceiptPayload = this.emptyForm();
  computedServiceCharge = 0;
  computedTotal = 0;
  formSubmitting = false;
  formError = '';
  formSuccess = '';

  // ── Report ────────────────────────────────────────────────────────
  report: PaymentReceiptReport | null = null;
  reportLoading = false;
  reportError = '';
  reportFrom = '';
  reportTo = '';

  // ── Service charge payment (inline in report) ─────────────────────
  showPayForm = false;
  payAmount = 0;
  payDate = '';
  payPaidTo = 'Roel Sundiam';
  payMethod = 'gcash';
  payAccount = '09175105185';
  payReference = '';
  payNotes = '';
  paySubmitting = false;
  payError = '';

  readonly scPaymentMethods = [
    { value: 'gcash', label: 'GCash' },
    { value: 'maya',  label: 'Maya' },
    { value: 'bank_transfer_maybank', label: 'Bank Transfer - Maybank' },
    { value: 'cash',  label: 'Cash' },
  ];

  players: Player[] = [];

  readonly reasons = RECEIPT_REASONS;

  readonly paymentMethods = [
    { value: 'maya',                  label: 'Maya' },
    { value: 'gcash',                 label: 'GCash' },
    { value: 'bank_transfer_maybank', label: 'Bank Transfer - Maybank' },
    { value: 'cash',                  label: 'Cash' },
  ];

  constructor(
    private receiptService: PaymentReceiptService,
    private playerService: PlayerService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadList();
    this.playerService.getActivePlayers().subscribe({
      next: (players) => { this.players = players; this.cdr.detectChanges(); },
    });
  }

  setView(v: PanelView): void {
    this.view = v;
    this.closePayForm();
    if (v === 'list')   this.loadList();
    if (v === 'report') this.loadReport();
  }

  // ── List ──────────────────────────────────────────────────────────
  loadList(): void {
    this.listLoading = true;
    this.listError = '';
    this.receiptService.getReceipts({
      from:          this.filterFrom   || undefined,
      to:            this.filterTo     || undefined,
      paymentMethod: this.filterMethod || undefined,
      reason:        this.filterReason || undefined,
    }).subscribe({
      next: (data) => { this.receipts = data; this.listLoading = false; this.cdr.detectChanges(); },
      error: () => { this.listError = 'Failed to load receipts.'; this.listLoading = false; this.cdr.detectChanges(); },
    });
  }

  // ── New Receipt Form ──────────────────────────────────────────────
  onAmountChange(): void {
    const base = Number(this.form.baseAmount) || 0;
    const isCourtFee = this.form.reason === 'Court Fee';
    this.computedServiceCharge = isCourtFee ? Math.round(base * 0.02 * 100) / 100 : 0;
    this.computedTotal = Math.round((base + this.computedServiceCharge) * 100) / 100;
  }

  submitForm(): void {
    this.formError = '';
    this.formSuccess = '';

    if (!this.form.playerName || !this.form.reason || !this.form.paymentDate ||
        !this.form.paymentMethod || !this.form.baseAmount) {
      this.formError = 'Please fill in all required fields.';
      return;
    }
    if (Number(this.form.baseAmount) <= 0) {
      this.formError = 'Amount must be greater than 0.';
      return;
    }

    this.formSubmitting = true;
    this.receiptService.createReceipt(this.form).subscribe({
      next: (receipt) => {
        this.formSuccess = `Receipt ${receipt.receiptNumber} created successfully.`;
        this.form = this.emptyForm();
        this.computedServiceCharge = 0;
        this.computedTotal = 0;
        this.formSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.formError = err?.error?.message || 'Failed to create receipt.';
        this.formSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  resetForm(): void {
    this.form = this.emptyForm();
    this.computedServiceCharge = 0;
    this.computedTotal = 0;
    this.formError = '';
    this.formSuccess = '';
  }

  // ── Report ────────────────────────────────────────────────────────
  loadReport(): void {
    this.reportLoading = true;
    this.reportError = '';
    this.receiptService.getReport({
      from: this.reportFrom || undefined,
      to:   this.reportTo   || undefined,
    }).subscribe({
      next: (data) => { this.report = data; this.reportLoading = false; this.cdr.detectChanges(); },
      error: () => { this.reportError = 'Failed to load report.'; this.reportLoading = false; this.cdr.detectChanges(); },
    });
  }

  // ── Service charge payment ────────────────────────────────────────
  openPayForm(): void {
    this.payAmount    = this.report?.scLedger?.balance ?? 0;
    this.payDate      = new Date().toISOString().slice(0, 10);
    this.payPaidTo    = 'Roel Sundiam';
    this.payMethod    = 'gcash';
    this.payAccount   = '09175105185';
    this.payReference = '';
    this.payNotes     = '';
    this.payError     = '';
    this.showPayForm  = true;
  }

  closePayForm(): void {
    this.showPayForm   = false;
    this.paySubmitting = false;
    this.payError      = '';
  }

  submitPay(): void {
    this.payError = '';
    if (!this.payAmount || this.payAmount <= 0) { this.payError = 'Enter a valid amount.'; return; }
    if (!this.payDate)                          { this.payError = 'Select a payment date.'; return; }
    if (!this.payPaidTo)                        { this.payError = 'Paid To is required.'; return; }
    if (!this.payMethod)                        { this.payError = 'Payment method is required.'; return; }

    this.paySubmitting = true;
    this.receiptService.recordServiceChargePayment({
      amount:          this.payAmount,
      paidAt:          this.payDate,
      paidTo:          this.payPaidTo,
      paymentMethod:   this.payMethod,
      accountNumber:   this.payAccount  || undefined,
      referenceNumber: this.payReference || undefined,
      notes:           this.payNotes    || undefined,
    }).subscribe({
      next: () => {
        this.closePayForm();
        this.loadReport();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.payError = err?.error?.message || 'Failed to record payment.';
        this.paySubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  formatPaymentDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatMethod(method: string): string {
    const labels: Record<string, string> = {
      maya:                  'Maya',
      gcash:                 'GCash',
      bank_transfer_maybank: 'Bank Transfer - Maybank',
      cash:                  'Cash',
    };
    return labels[method] ?? method;
  }

  formatCurrency(n: number | null | undefined): string {
    const v = n ?? 0;
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private emptyForm(): CreateReceiptPayload {
    return {
      playerName:       '',
      reason:           '',
      paymentDate:      new Date().toISOString().slice(0, 10),
      paymentMethod:    '',
      paymentReference: '',
      baseAmount:       0,
      notes:            '',
    };
  }
}
