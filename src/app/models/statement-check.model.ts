/**
 * Statement Check Models
 * Bulk verify from a GCash statement (spec 004): the results of
 * POST /api/payment/collection/:collectionId/statement-check and
 * POST /api/payment/collection/:collectionId/bulk-verify.
 * Contract: specs/004-gcash-bulk-verify/contracts/README.md
 */

import { Payment } from './payment.model';

export type MatchOutcome = 'matched' | 'mismatch' | 'not_found';

/** Why a payment didn't match. Present only on a mismatch. */
export type MatchReason =
  | { code: 'AMOUNT_DIFFERS'; app: number; statement: number }
  | { code: 'NOT_RECEIVED' }
  | { code: 'DUPLICATE_REFERENCE' }
  | { code: 'DUPLICATE_IN_STATEMENT' };

/** Informational; never blocks a match. Dates are 'YYYY-MM-DD'. */
export type MatchNote =
  | { code: 'NO_DATE' }
  | { code: 'DATE_DIFFERS'; app: string; statement: string };

export interface StatementMatchResult {
  paymentId: string;
  name: string;
  amount: number;
  referenceNumber: string;
  transactionDate?: string;
  outcome: MatchOutcome;
  reasons: MatchReason[];
  notes: MatchNote[];
  /** The statement entry compared with; null when not found or duplicated. */
  statementEntry: {
    dateTime: string;
    amount: number;
    direction: 'received' | 'sent';
  } | null;
}

export interface StatementCheckResponse {
  statement: { from: string; to: string; entryCount: number };
  summary: {
    checked: number;
    matched: number;
    mismatched: number;
    notFound: number;
    matchedTotal: number;
  };
  results: StatementMatchResult[];
}

export type BulkVerifySkip =
  | { paymentId: string; reason: 'ALREADY_REVIEWED'; status: 'confirmed' | 'rejected' }
  | { paymentId: string; reason: 'NOT_FOUND' };

export interface BulkVerifyResponse {
  verified: Payment[];
  skipped: BulkVerifySkip[];
}

export type StatementErrorCode =
  | 'NOT_PDF'
  | 'FILE_TOO_LARGE'
  | 'NOT_CLUB_ADMIN'
  | 'COLLECTION_NOT_FOUND'
  | 'PASSWORD_REQUIRED'
  | 'PASSWORD_INCORRECT'
  | 'NO_TRANSACTIONS'
  | 'NO_CREDITS'
  | 'UNRELIABLE'
  | 'TIMEOUT'
  | 'INVALID_PAYMENT_IDS'
  | 'SERVER_ERROR';

/** Error body of both routes; `message` is safe to show as is. */
export interface StatementApiError {
  code: StatementErrorCode;
  message: string;
}
