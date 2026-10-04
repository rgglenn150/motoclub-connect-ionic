/**
 * Collection Model
 * Shape of a club collection (dues / fund drive) as returned by
 * GET /api/collection/club/:clubId and POST /api/collection/create.
 * Contract: specs/001-share-link-previews/contracts/collection.md
 */

export interface Collection {
  _id: string;
  club: string;
  clubName?: string;
  name: string;
  description?: string;
  targetAmount?: number;
  visibility: 'public' | 'members_only';
  status: 'open' | 'closed';
  /** All payments, including rejected ones. */
  paymentCount: number;
  /** Sum of payments an admin has confirmed. */
  confirmedTotal: number;
  /** Sum of payments awaiting admin review. */
  pendingTotal: number;
  /** @deprecated Equals confirmedTotal; kept for cached PWA builds. */
  totalCollected: number;
  createdAt: string;
  updatedAt: string;
}
