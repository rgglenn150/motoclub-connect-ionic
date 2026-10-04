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
  /** Sum of pending payments (not yet reviewed by an admin). */
  pendingTotal: number;
  /** @deprecated Equals confirmedTotal; kept for cached PWA builds. */
  totalCollected: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Body of PUT /api/collection/:collectionId (spec 006). The app always sends
 * all four editable fields; `targetAmount: null` clears the target.
 * Contract: specs/006-collection-admin-menu/contracts/README.md
 */
export interface CollectionEdit {
  name: string;
  description: string;
  targetAmount: number | null;
  visibility: Collection['visibility'];
}

export type CollectionEditField = keyof CollectionEdit | 'status';

/** 400 body when an edit fails validation; `errors` names every failing field. */
export interface CollectionEditError {
  code: 'INVALID_COLLECTION';
  message: string;
  errors: Partial<Record<CollectionEditField, string>>;
}
