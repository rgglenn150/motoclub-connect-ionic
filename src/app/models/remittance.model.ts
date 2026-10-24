/**
 * Remittance Model
 * A handover of collected money (spec 009), as returned by
 * GET /api/remittance/collection/:collectionId and the create / void endpoints.
 * Contract: specs/009-collection-remittances/contracts/README.md
 */

export type RemittanceRecipientType = 'member' | 'external';
export type RemittanceVisibility = 'admins' | 'members' | 'public';
export type RemittanceStatus = 'active' | 'voided';

export interface Remittance {
  _id: string;
  collection: string;
  club: string;
  amount: number;
  /** Calendar date, YYYY-MM-DD. */
  remittedOn: string;
  recipientType: RemittanceRecipientType;
  /** The member's name as it was when recorded, or the external party's name. */
  recipientName: string;
  note?: string;
  visibility: RemittanceVisibility;
  /** Non-admins only ever receive active records. */
  status: RemittanceStatus;
  createdAt: string;
  updatedAt?: string;
  /** True for club admins. */
  detailsVisible: boolean;
  // Present only when detailsVisible is true:
  recipientAccount?: string;
  proofUrl?: string;
  recordedBy?: { _id: string; username: string };
  voidedBy?: { _id: string; username: string };
  voidedAt?: string;
  voidReason?: string;
}

/** Worked out by the API; the app shows these as sent and never recomputes them. */
export interface RemittanceSummary {
  verifiedTotal: number;
  remittedTotal: number;
  availableToRemit: number;
  /** Some active remittances exist that this viewer isn't sent. */
  hasHidden: boolean;
}

export interface RemittanceListResponse {
  summary: RemittanceSummary;
  remittances: Remittance[];
}

/** Response of create and void: the record as an admin sees it, plus fresh totals. */
export interface RemittanceChangeResponse {
  remittance: Remittance;
  summary: RemittanceSummary;
}

/** What the Remit dialog sends; the proof photo travels separately. */
export interface RemittanceCreate {
  collection: string;
  amount: number;
  recipientType: RemittanceRecipientType;
  /** Member document id; member recipients only. */
  memberId?: string;
  /** External recipients only. */
  recipientName?: string;
  recipientAccount?: string;
  note?: string;
  visibility: RemittanceVisibility;
  /** YYYY-MM-DD. */
  remittedOn: string;
}

export type RemittanceErrorCode =
  | 'INVALID_REMITTANCE'
  | 'EXCEEDS_AVAILABLE'
  | 'LEDGER_BUSY'
  | 'ALREADY_VOIDED'
  | 'REMITTED_EXCEEDS_VERIFIED'
  | 'ACTIVE_REMITTANCES';

export type RemittanceField = keyof RemittanceCreate | 'reason' | 'proof';

/** 400 body: every failing field is named. */
export interface RemittanceValidationError {
  code: 'INVALID_REMITTANCE';
  message: string;
  errors: Partial<Record<RemittanceField, string>>;
}

/** 409 body when the amount is above what is available. */
export interface RemittanceExceedsError {
  code: 'EXCEEDS_AVAILABLE';
  message: string;
  availableToRemit: number;
}
