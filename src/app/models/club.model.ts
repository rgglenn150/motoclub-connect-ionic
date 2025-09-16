/**
 * Club-related interfaces and types for the Motoclub Connect application
 */

export interface Geolocation {
  latitude: number;
  longitude: number;
  placeName: string;
}

/**
 * Main Club interface representing the complete club data structure
 */
export interface Club {
  _id?: string;
  id?: string; // For compatibility with frontend routing
  clubName: string;
  description: string;
  location?: string;
  geolocation?: Geolocation;
  isPrivate: boolean;
  members?: ClubMember[]; // More specific typing for members
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  logoUrl?: string; // For club logo display
}

/**
 * Interface for club update requests
 * All fields are optional to support partial updates
 */
export interface ClubUpdateRequest {
  clubName?: string;
  description?: string;
  location?: string;
  geolocation?: Geolocation;
  isPrivate?: boolean;
}

/**
 * Interface for club creation requests
 * Required fields for creating a new club
 */
export interface ClubCreateRequest {
  clubName: string;
  description: string;
  location?: string;
  geolocation?: Geolocation;
  isPrivate: boolean;
}

/**
 * Interface for club name availability check response
 */
export interface ClubAvailabilityCheck {
  available: boolean;
  message?: string;
}

/**
 * Interface for club member data
 */
export interface ClubMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  club: string;
  role: 'member' | 'admin';
  joinedAt: string;
}

/**
 * Interface for join request data
 */
export interface JoinRequest {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  club: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

/**
 * Interface for club search and filtering
 */
export interface ClubSearchCriteria {
  name?: string;
  location?: string;
  isPrivate?: boolean;
  radius?: number; // For geolocation-based search
  latitude?: number;
  longitude?: number;
}

/**
 * Interface for club statistics and metrics
 */
export interface ClubStats {
  memberCount: number;
  eventCount: number;
  upcomingEventCount: number;
  joinRequestCount?: number; // Only for admins
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Multi-field validation result interface
 */
export interface MultiValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Club visibility options
 */
export enum ClubVisibility {
  PUBLIC = 0,
  PRIVATE = 1
}

/**
 * Club member roles
 */
export enum ClubRole {
  MEMBER = 'member',
  ADMIN = 'admin'
}

/**
 * Join request status options
 */
export enum JoinRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}