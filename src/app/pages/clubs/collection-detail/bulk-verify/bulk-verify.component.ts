import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PaymentService } from '../../../../service/payment.service';
import {
  BulkVerifyResponse,
  MatchNote,
  MatchReason,
  StatementApiError,
  StatementCheckResponse,
  StatementMatchResult,
} from '../../../../models/statement-check.model';
import { isPdfEncrypted } from '../../../../shared/pdf-encryption';

const MAX_BYTES = 10 * 1024 * 1024;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type BulkVerifyState = 'pick' | 'password' | 'checking' | 'results' | 'error';

/** ₱1,800 / ₱1,000.50 */
function peso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

/** 'YYYY-MM-DD' → 'Oct 2' without going through a timezone. */
function shortDate(day: string): string {
  const [, month, date] = day.split('-').map(Number);
  return `${MONTHS[month - 1]} ${date}`;
}

/**
 * Bulk verify from a GCash statement (spec 004). The admin picks the PDF, gives
 * its password only when it is protected (D6), and sees every pending payment
 * grouped as matched, mismatch or not found. The file stays in
 * memory here only for password retries; the server keeps nothing.
 */
@Component({
  selector: 'app-bulk-verify',
  templateUrl: './bulk-verify.component.html',
  styleUrls: ['./bulk-verify.component.scss'],
})
export class BulkVerifyComponent {
  @Input() collectionId = '';
  /** A result was tapped: open that payment's dialog (red-team F1). */
  @Output() openPayment = new EventEmitter<string>();
  /** A verify was attempted: reload payments and totals, success or not (red-team F3). */
  @Output() changed = new EventEmitter<void>();
  /** Verified: close the window. */
  @Output() done = new EventEmitter<void>();

  state: BulkVerifyState = 'pick';
  file: File | null = null;
  fileError: string | null = null;
  password = '';
  passwordError: string | null = null;
  errorMessage: string | null = null;
  result: StatementCheckResponse | null = null;
  /** Matched payments ticked for Verify selected (US2). */
  selected = new Set<string>();
  verifying = false;

  constructor(
    private paymentService: PaymentService,
    private toastController: ToastController,
  ) {}

  get selectedCount(): number {
    return this.selected.size;
  }

  get matched(): StatementMatchResult[] {
    return this.byOutcome('matched');
  }

  get mismatched(): StatementMatchResult[] {
    return this.byOutcome('mismatch');
  }

  get notFound(): StatementMatchResult[] {
    return this.byOutcome('not_found');
  }

  get period(): string {
    if (!this.result) return '';
    const { from, to } = this.result.statement;
    return `${shortDate(from)} – ${shortDate(to)}, ${to.slice(0, 4)}`;
  }

  get matchedTotal(): string {
    return peso(this.result?.summary.matchedTotal ?? 0);
  }

  onFileSelected(event: globalThis.Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // let the same file be picked again
    if (file) this.selectFile(file);
  }

  /** Validate before any upload (FR-013), then ask for a password only if needed. */
  async selectFile(file: File) {
    this.fileError = null;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.fileError = 'Please choose a PDF file.';
      return;
    }
    if (file.size > MAX_BYTES) {
      this.fileError = 'This file is larger than 10 MB.';
      return;
    }
    this.file = file;
    this.password = '';
    this.passwordError = null;
    if (await isPdfEncrypted(file)) {
      this.state = 'password';
    } else {
      this.check();
    }
  }

  submitPassword() {
    if (this.state !== 'password' || !this.password) return;
    this.check(this.password);
  }

  retry() {
    if (this.file) this.check(this.password || undefined);
  }

  reset() {
    this.state = 'pick';
    this.file = null;
    this.password = '';
    this.passwordError = null;
    this.errorMessage = null;
    this.result = null;
    this.selected.clear();
  }

  isSelected(paymentId: string): boolean {
    return this.selected.has(paymentId);
  }

  toggle(paymentId: string, checked: boolean) {
    if (checked) this.selected.add(paymentId);
    else this.selected.delete(paymentId);
  }

  get allSelected(): boolean {
    return this.matched.length > 0 && this.matched.every((r) => this.selected.has(r.paymentId));
  }

  /** Select every match, or clear them all when all are already selected (FR-016). */
  toggleAll() {
    this.selected = this.allSelected ? new Set() : new Set(this.matched.map((r) => r.paymentId));
  }

  /** Verify the ticked matches in one request (US2). */
  async verifySelected() {
    if (this.verifying || this.selected.size === 0) return;
    this.verifying = true;
    const ids = this.matched.map((r) => r.paymentId).filter((id) => this.selected.has(id));
    try {
      const res = await firstValueFrom(this.paymentService.bulkVerify(this.collectionId, ids));
      this.changed.emit();
      await this.toast(this.verifiedText(res), 'success');
      this.done.emit();
    } catch (err) {
      this.changed.emit();
      await this.toast(this.errorText(err as HttpErrorResponse), 'danger');
    } finally {
      this.verifying = false;
    }
  }

  reasonText(reason: MatchReason): string {
    switch (reason.code) {
      case 'AMOUNT_DIFFERS':
        return `Amount differs: ${peso(reason.app)} in app, ${peso(reason.statement)} in statement`;
      case 'NOT_RECEIVED':
        return 'Not a received payment';
      case 'DUPLICATE_REFERENCE':
        return 'Duplicate reference in this collection';
      case 'DUPLICATE_IN_STATEMENT':
        return 'Appears more than once in the statement';
    }
  }

  noteText(note: MatchNote): string {
    switch (note.code) {
      case 'NO_DATE':
        return 'No date on payment';
      case 'DATE_DIFFERS':
        return `Date differs: ${shortDate(note.app)} in app, ${shortDate(note.statement)} in statement`;
    }
  }

  amountText(amount: number): string {
    return peso(amount);
  }

  private byOutcome(outcome: StatementMatchResult['outcome']): StatementMatchResult[] {
    return this.result?.results.filter((r) => r.outcome === outcome) ?? [];
  }

  private check(password?: string) {
    if (!this.file || this.state === 'checking') return;
    this.state = 'checking';
    this.passwordError = null;
    this.errorMessage = null;
    this.paymentService.checkStatement(this.collectionId, this.file, password).subscribe({
      next: (result) => {
        this.result = result;
        this.selected = new Set(this.matched.map((r) => r.paymentId));
        this.state = 'results';
      },
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

  private showError(err: HttpErrorResponse) {
    const body = err.error as StatementApiError | null;
    if (body?.code === 'PASSWORD_REQUIRED') {
      this.state = 'password';
      return;
    }
    if (body?.code === 'PASSWORD_INCORRECT') {
      this.state = 'password';
      this.passwordError = body.message;
      return;
    }
    this.state = 'error';
    this.errorMessage = this.errorText(err);
  }

  private errorText(err: HttpErrorResponse): string {
    if (err.status === 0) return "Couldn't reach the server. Check your connection and try again.";
    return (err.error as StatementApiError | null)?.message ?? 'Something went wrong. Please try again.';
  }

  /** "2 payments verified · 1 already reviewed" */
  private verifiedText(res: BulkVerifyResponse): string {
    const n = res.verified.length;
    const parts = [`${n} ${n === 1 ? 'payment' : 'payments'} verified`];
    const reviewed = res.skipped.filter((s) => s.reason === 'ALREADY_REVIEWED').length;
    const missing = res.skipped.length - reviewed;
    if (reviewed) parts.push(`${reviewed} already reviewed`);
    if (missing) parts.push(`${missing} not found`);
    return parts.join(' · ');
  }

  private async toast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({ message, duration: 3000, color, position: 'top' });
    await toast.present();
  }
}
