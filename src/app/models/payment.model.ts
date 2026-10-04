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
