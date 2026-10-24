import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RemittanceService } from '../../../../service/remittance.service';
import { ClubService } from '../../../../service/club.service';
import { ReceiptImageService } from '../../../../service/receipt-image.service';
import { receiptErrorCode } from '../../../../service/payment.service';
import { RECEIPT_ERROR_MESSAGES } from '../../../../models/payment.model';
import { ClubMember } from '../../../../models/club.model';
import {
  RemittanceChangeResponse,
  RemittanceCreate,
  RemittanceExceedsError,
  RemittanceField,
  RemittanceRecipientType,
  RemittanceValidationError,
  RemittanceVisibility,
} from '../../../../models/remittance.model';

// Same limits as the server (spec 009 contracts, POST create).
const MAX_AMOUNT = 10_000_000;
const NOTE_MAX = 500;
const NAME_MAX = 100;
const ACCOUNT_MAX = 200;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const peso = (amount: number) => `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

/** Today on this device as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface RemitForm {
  /** As typed. */
  amount: string;
  recipientType: RemittanceRecipientType;
  memberId: string;
  /** External recipients only. */
  recipientName: string;
  recipientAccount: string;
  note: string;
  visibility: RemittanceVisibility;
  remittedOn: string;
}

/**
 * Record a remittance (spec 009 Stories 1 and 2). The amount is capped here at what
 * the API says is available; the server's check under the lock is the one that
 * counts, and its refusal is shown as sent (FR-013).
 */
@Component({
  selector: 'app-remit-dialog',
  templateUrl: './remit-dialog.component.html',
  styleUrls: ['./remit-dialog.component.scss'],
})
export class RemitDialogComponent implements OnInit {
  @Input() collectionId = '';
  @Input() clubId = '';
  @Input() availableToRemit = 0;
  @Output() saved = new EventEmitter<RemittanceChangeResponse>();
  @Output() cancelled = new EventEmitter<void>();

  readonly today = localToday();
  form: RemitForm = {
    amount: '',
    recipientType: 'member',
    memberId: '',
    recipientName: '',
    recipientAccount: '',
    note: '',
    visibility: 'members',
    remittedOn: this.today,
  };
  errors: Partial<Record<RemittanceField, string>> = {};
  saving = false;
  saveError: string | null = null;

  /** Prepared on the device like a receipt photo (spec 008 D1, spec 009 FR-014). */
  proofFile: File | null = null;
  proofPreviewUrl: string | null = null;
  preparingProof = false;
  proofError: string | null = null;

  members: ClubMember[] = [];
  membersLoading = false;
  membersError = false;

  constructor(
    private remittanceService: RemittanceService,
    private clubService: ClubService,
    private receiptImage: ReceiptImageService,
  ) {}

  ngOnInit() {
    this.loadMembers();
  }

  get nothingAvailable(): boolean {
    return !(this.availableToRemit > 0);
  }

  get canSave(): boolean {
    return (
      !this.saving &&
      !this.nothingAvailable &&
      !this.preparingProof &&
      this.form.amount.trim() !== '' &&
      this.hasRecipient &&
      Object.keys(this.errors).length === 0
    );
  }

  /** What each choice means (D3); totals still count every active record (D7). */
  get visibilityHint(): string {
    switch (this.form.visibility) {
      case 'admins':
        return 'Only club admins see this record. Members see that some remittances are hidden.';
      case 'public':
        return 'Anyone who can see this collection sees the name, amount, date and note.';
      default:
        return 'Club members see the name, amount, date and note.';
    }
  }

  get hasRecipient(): boolean {
    return this.form.recipientType === 'member' ? !!this.form.memberId : this.form.recipientName.trim() !== '';
  }

  loadMembers() {
    this.membersLoading = true;
    this.membersError = false;
    this.clubService.getClubMembers(this.clubId).subscribe({
      next: (members) => {
        this.members = [...members].sort((a, b) => a.user.name.localeCompare(b.user.name));
        this.membersLoading = false;
      },
      error: () => {
        this.membersLoading = false;
        this.membersError = true;
      },
    });
  }

  validate() {
    const errors: Partial<Record<RemittanceField, string>> = {};
    const amountText = this.form.amount.trim();
    if (amountText !== '') {
      const amount = Number(amountText);
      if (!AMOUNT_PATTERN.test(amountText) || !(amount > 0) || amount > MAX_AMOUNT) {
        errors.amount = 'Enter an amount above ₱0 with at most 2 decimals, up to ₱10,000,000.';
      } else if (Math.round(amount * 100) > Math.round(this.availableToRemit * 100)) {
        errors.amount = `Only ${peso(this.availableToRemit)} available to remit`;
      }
    }
    if (!this.form.remittedOn) errors.remittedOn = 'Enter a date.';
    else if (this.form.remittedOn > this.today) errors.remittedOn = "The date can't be in the future.";
    if (this.form.note.trim().length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`;
    if (this.form.recipientType === 'external') {
      if (this.form.recipientName.trim().length > NAME_MAX) errors.recipientName = `Keep the name under ${NAME_MAX} characters.`;
      if (this.form.recipientAccount.trim().length > ACCOUNT_MAX) {
        errors.recipientAccount = `Keep the account details under ${ACCOUNT_MAX} characters.`;
      }
    }
    this.errors = errors;
  }

  async onProofSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const picked = input.files?.[0];
    input.value = '';
    if (!picked) return;
    this.proofError = null;
    if (!picked.type.startsWith('image/')) {
      this.proofError = RECEIPT_ERROR_MESSAGES.UNSUPPORTED_FORMAT;
      return;
    }
    this.preparingProof = true;
    const file = await this.receiptImage.prepare(picked);
    this.preparingProof = false;
    this.proofFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (this.proofFile === file) this.proofPreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeProof() {
    this.proofFile = null;
    this.proofPreviewUrl = null;
    this.proofError = null;
  }

  private payload(): RemittanceCreate {
    const note = this.form.note.trim();
    const recipientAccount = this.form.recipientAccount.trim();
    const recipient =
      this.form.recipientType === 'member'
        ? { memberId: this.form.memberId }
        : { recipientName: this.form.recipientName.trim(), ...(recipientAccount && { recipientAccount }) };
    return {
      collection: this.collectionId,
      amount: Number(this.form.amount.trim()),
      recipientType: this.form.recipientType,
      ...recipient,
      ...(note && { note }),
      visibility: this.form.visibility,
      remittedOn: this.form.remittedOn,
    };
  }

  save() {
    this.validate();
    if (!this.canSave) return;
    this.saving = true;
    this.saveError = null;
    this.remittanceService.create(this.payload(), this.proofFile).subscribe({
      next: (res) => {
        this.saving = false;
        this.saved.emit(res);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.showSaveError(err);
      },
    });
  }

  private showSaveError(err: HttpErrorResponse) {
    if (err.status === 0) {
      this.saveError = "Couldn't reach the server. The remittance wasn't saved.";
      return;
    }
    const photoCode = receiptErrorCode(err);
    if (photoCode === 'FILE_TOO_LARGE' || photoCode === 'UNSUPPORTED_FORMAT') {
      this.saveError = RECEIPT_ERROR_MESSAGES[photoCode];
      return;
    }
    const body = (err.error ?? {}) as Partial<RemittanceValidationError | RemittanceExceedsError>;
    if (body.code === 'INVALID_REMITTANCE' && 'errors' in body && body.errors) {
      this.errors = { ...body.errors };
    }
    if (body.code === 'EXCEEDS_AVAILABLE' && 'availableToRemit' in body && typeof body.availableToRemit === 'number') {
      this.availableToRemit = body.availableToRemit;
    }
    this.saveError = body.message || "The remittance wasn't saved. Please try again.";
  }
}
