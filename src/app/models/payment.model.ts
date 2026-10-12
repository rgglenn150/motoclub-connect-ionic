/**
 * Payment Model
 * A contribution to a collection, as returned by GET /api/payment/collection/:id
 * and the create / status endpoints.
 * Contract: specs/003-payment-status-wording/contracts/README.md
 */

import { PaymentStatus } from '../pipes/payment-status.pipe';

export interface Payment {
  _id: string;
  collection: string;
  club: string;
  /** Payer's display name. Visible to everyone who can see the collection. */
  name: string;
  amount: number;
  status: PaymentStatus;
  transactionDate?: string;
  createdAt: string;
  updatedAt?: string;
  /** True for club admins, and for the signed-in member who submitted it. */
  detailsVisible: boolean;
  // Present only when detailsVisible is true:
  accountName?: string;
  referenceNumber?: string;
  phoneNumber?: string;
  description?: string;
  receiptUrl?: string;
  createdBy?: { _id: string; username: string } | null;
}

/**
 * Fields read from a receipt by POST /api/payment/extract-receipt. Any may be
 * null, but never all of them (that is an UNREADABLE error).
 * Contract: specs/008-receipt-photos-dialog-back/contracts/README.md
 */
export interface ReceiptExtraction {
  name: string | null;
  amount: number | null;
  referenceNumber: string | null;
  phoneNumber: string | null;
  transactionDateTime: string | null;
}

/** Codes the API returns for a receipt upload (spec 008 FR-005, FR-006). */
export type ReceiptApiErrorCode = 'FILE_TOO_LARGE' | 'UNSUPPORTED_FORMAT' | 'READER_UNAVAILABLE' | 'UNREADABLE';

/** Every reason a receipt can't be read; the last two are decided by the app. */
export type ReceiptErrorCode = ReceiptApiErrorCode | 'NO_CONNECTION' | 'UNKNOWN';

/** Body of a coded receipt error. */
export interface ReceiptError {
  code: ReceiptApiErrorCode;
  message: string;
}

/** Same text as the API, so a locally detected failure reads the same. */
export const RECEIPT_ERROR_MESSAGES: Record<ReceiptErrorCode, string> = {
  FILE_TOO_LARGE: 'This photo is too large. Try a screenshot of the receipt instead.',
  UNSUPPORTED_FORMAT: "This photo format isn't supported. Try a screenshot or a JPEG/PNG image.",
  READER_UNAVAILABLE: 'Receipt reading is unavailable right now. Please fill in the fields manually.',
  UNREADABLE: "Couldn't read this receipt. Please fill in the fields manually.",
  NO_CONNECTION: "Couldn't reach the server. Check your connection and try again.",
  UNKNOWN: 'Could not read receipt. Please fill in the fields manually.',
};
