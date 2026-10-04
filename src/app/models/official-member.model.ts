/**
 * Official Member Model
 * TypeScript interfaces for official club member data structures
 */

// ==================== CORE INTERFACES ====================

/**
 * Official Member - Represents an official club member
 */
export interface OfficialMember {
  _id: string;
  club: string | ClubReference;
  officialNumber: string;
  firstName: string;
  lastName: string;
  address?: string;
  plateNumber?: string;
  description?: string;
  metadata?: Record<string, any>;
  photoUrl?: string;
  photoPublicId?: string;
  claimedBy?: string | UserReference;
  claimedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Club Reference (populated)
 */
export interface ClubReference {
  _id: string;
  clubName: string;
  logoUrl?: string;
}

/**
 * User Reference (populated)
 */
export interface UserReference {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
}

// ==================== CLAIM REQUEST INTERFACES ====================

/**
 * Claim Request - Represents a user's request to claim an official member profile
 */
export interface ClaimRequest {
  _id: string;
  officialMember: string | OfficialMember;
  club: string;
  user: string | UserReference;
  verificationNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  responseNotes?: string;
  createdAt: Date;
  processedAt?: Date;
}

// ==================== CSV INTERFACES ====================

/**
 * CSV Import Result
 */
export interface CSVImportResult {
  message: string;
  results: {
    successful: number;
    failed: number;
    duplicates: number;
    errors: Array<{
      row: any;
      error: string;
    }>;
  };
}

/**
 * CSV Row for import
 */
export interface CSVRow {
  officialNumber: string;
  firstName: string;
  lastName: string;
  address?: string;
  plateNumber?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// ==================== SEARCH & FILTER INTERFACES ====================

/**
 * Search parameters for official members
 */
export interface OfficialMemberSearchParams {
  q: string;
  page?: number;
  limit?: number;
}

/**
 * Search response
 */
export interface OfficialMemberSearchResponse {
  officialMembers: OfficialMember[];
  searchQuery: string;
  pagination: PaginationInfo;
}

/**
 * Filter parameters for official members
 */
export interface OfficialMemberFilters {
  isActive?: boolean;
  isClaimed?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Filter response
 */
export interface OfficialMemberFilterResponse {
  officialMembers: OfficialMember[];
  filters: {
    isActive?: string;
    isClaimed?: string;
  };
  pagination: PaginationInfo;
}

// ==================== PAGINATION INTERFACES ====================

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// ==================== VISIBILITY INTERFACES ====================

/**
 * Official Member Visibility settings
 */
export interface OfficialMemberVisibility {
  visibility: 'public' | 'members' | 'admins';
}

/**
 * Visibility options
 */
export type VisibilityOption = 'public' | 'members' | 'admins';

// ==================== REQUEST/RESPONSE INTERFACES ====================

/**
 * Create Official Member Request
 */
export interface CreateOfficialMemberRequest {
  officialNumber: string;
  firstName: string;
  lastName: string;
  address?: string;
  plateNumber?: string;
  description?: string;
  metadata?: Record<string, any>;
  photoUrl?: string;
}

/**
 * Update Official Member Request
 */
export interface UpdateOfficialMemberRequest {
  officialNumber?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  plateNumber?: string;
  description?: string;
  metadata?: Record<string, any>;
  photoUrl?: string;
  isActive?: boolean;
}

/**
 * Create Claim Request Request
 */
export interface CreateClaimRequestRequest {
  verificationNotes?: string;
}

/**
 * Reject Claim Request Request
 */
export interface RejectClaimRequestRequest {
  responseNotes?: string;
}

/**
 * Update Visibility Request
 */
export interface UpdateVisibilityRequest {
  visibility: VisibilityOption;
}

// ==================== API RESPONSE WRAPPERS ====================

/**
 * Get Official Members Response
 */
export interface GetOfficialMembersResponse {
  officialMembers: OfficialMember[];
  pagination: PaginationInfo;
}

/**
 * Get Official Member By ID Response
 */
export interface GetOfficialMemberByIdResponse {
  officialMember: OfficialMember;
}

/**
 * Create Official Member Response
 */
export interface CreateOfficialMemberResponse {
  message: string;
  officialMember: OfficialMember;
}

/**
 * Update Official Member Response
 */
export interface UpdateOfficialMemberResponse {
  message: string;
  officialMember: OfficialMember;
}

/**
 * Delete Official Member Response
 */
export interface DeleteOfficialMemberResponse {
  message: string;
}

/**
 * Get Claim Requests Response
 */
export interface GetClaimRequestsResponse {
  claimRequests: ClaimRequest[];
}

/**
 * Create Claim Request Response
 */
export interface CreateClaimRequestResponse {
  message: string;
  claimRequest: ClaimRequest;
}

/**
 * Approve Claim Request Response
 */
export interface ApproveClaimRequestResponse {
  message: string;
  officialMember: OfficialMember;
  claimRequest: ClaimRequest;
}

/**
 * Reject Claim Request Response
 */
export interface RejectClaimRequestResponse {
  message: string;
  claimRequest: ClaimRequest;
}

/**
 * Get Visibility Response
 */
export interface GetVisibilityResponse {
  visibility: VisibilityOption;
}

/**
 * Update Visibility Response
 */
export interface UpdateVisibilityResponse {
  message: string;
  visibility: VisibilityOption;
}
