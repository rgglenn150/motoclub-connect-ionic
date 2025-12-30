import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ClubService,
  Club as ServiceClub,
  JoinRequest,
  ClubMember,
} from '../../../service/club.service';
import {
  ToastController,
  LoadingController,
  AlertController,
  ActionSheetController,
} from '@ionic/angular';
import {
  NetworkService,
  NetworkStatus,
  ConnectionQuality,
} from '../../../service/network.service';
import { ErrorService, ErrorInfo } from '../../../service/error.service';
import { UserStateService } from '../../../service/user-state.service';
import { EventService, Event } from '../../../service/event.service';
import { Subscription } from 'rxjs';
import { switchMap, tap, finalize } from 'rxjs/operators';

// Define interfaces for your data structures for type safety
interface Club {
  _id?: string;
  id?: string;
  name: string;
  clubName?: string; // Backend uses clubName
  location: string;
  memberCount: number;
  coverPhotoUrl: string;
  logoUrl: string;
  isPrivate: boolean;
  description?: string;
  members?: any[];
  createdBy?: string;
  createdAt?: string;
}

interface Member {
  name: string;
  role: 'Admin' | 'Member';
  avatarUrl: string;
}

interface PinnedPost {
  title: string;
  content: string;
}

@Component({
  selector: 'app-club-home',
  templateUrl: './club-home.page.html',
  styleUrls: ['./club-home.page.scss'],
})
export class ClubHomePage implements OnInit, OnDestroy, ViewWillEnter {
  // --- STATE MANAGEMENT ---
  // Club ID from route parameter
  clubId: string | null = null;

  // Loading and error states
  isLoading: boolean = false;
  statusLoading: boolean = false;
  joiningClub: boolean = false;
  isRefreshing: boolean = false;
  errorMessage: string = '';

  // Enhanced error handling
  currentError: ErrorInfo | null = null;
  retryAttempts: number = 0;
  maxRetryAttempts: number = 3;
  isRetrying: boolean = false;

  // Network status
  networkStatus: NetworkStatus = { online: true };
  connectionQuality: ConnectionQuality = {
    quality: 'good',
    description: 'Connected',
    color: 'success',
    icon: 'wifi-outline',
  };

  // Operation-specific error states
  operationErrors: {
    clubData: ErrorInfo | null;
    membershipStatus: ErrorInfo | null;
    joinOperation: ErrorInfo | null;
    adminOperations: ErrorInfo | null;
  } = {
    clubData: null,
    membershipStatus: null,
    joinOperation: null,
    adminOperations: null,
  };

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  // This variable controls which tab is currently active.
  selectedTab: 'feed' | 'members' | 'events' = 'feed';

  // User's membership status in this club - dynamically determined via API
  userStatus: 'admin' | 'member' | 'pending' | 'not-member' = 'not-member';

  // Additional membership info from API
  membershipData: {
    role?: 'member' | 'admin';
    joinRequestId?: string;
    memberSince?: string;
    permissions?: string[];
    memberId?: string;
  } = {};

  // --- ADMIN MANAGEMENT STATE ---
  // Join requests data
  joinRequests: JoinRequest[] = [];
  joinRequestsLoading: boolean = false;

  // Club members data
  clubMembers: ClubMember[] = [];
  membersLoading: boolean = false;

  // Operation loading states
  processingRequests: Set<string> = new Set(); // Track which requests are being processed
  processingMembers: Set<string> = new Set(); // Track which members are being processed

  // --- MODAL STATE MANAGEMENT ---
  showMembersModal: boolean = false;

  // --- RACE CONDITION PREVENTION ---
  // Track ongoing operations to prevent race conditions
  private operationLocks = {
    joinClub: false,
    refreshData: false,
    membershipStatusCheck: false,
    adminDataLoad: false,
  };

  // Debounce timer for join action
  private joinDebounceTimer: any = null;
  private readonly JOIN_DEBOUNCE_MS = 500;

  // Track last membership status check timestamp
  private lastStatusCheckTime = 0;
  private readonly STATUS_CHECK_COOLDOWN_MS = 2000;

  // Queue for pending operations
  private operationQueue: Array<{
    type: string;
    data: any;
    resolve: Function;
    reject: Function;
  }> = [];
  private isProcessingQueue = false;

  // Action state tracking
  private actionInProgress = {
    join: false,
    refresh: false,
    loadData: false,
    adminActions: false,
  };

  // Request deduplication tracking
  private pendingRequests = new Map<string, Promise<any>>();

  // Club data - will be populated from API
  club: Club = {
    name: '',
    location: '',
    memberCount: 0,
    isPrivate: false,
    coverPhotoUrl: 'https://placehold.co/600x250/2D3748/FFFFFF?text=Loading...',
    logoUrl: 'https://placehold.co/100x100/4A5568/FFFFFF?text=..',
  };

  pinnedPost: PinnedPost = {
    title: 'Clubhouse Maintenance Day',
    content:
      "Heads up, everyone! We're having a mandatory maintenance day this Saturday. Please come down to help clean and prep for the new season. Pizza and drinks on us!",
  };

  // Members data will be loaded from the API when the members tab is viewed
  membersForPublicView: ClubMember[] = []; // For non-admin users
  membersDataLoading: boolean = false; // Loading state for member data
  memberError: string | null = null; // Error state for member loading

  // Real events data from API
  clubEvents: Event[] = [];
  eventsLoading: boolean = false;
  eventsError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clubService: ClubService,
    private eventService: EventService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private networkService: NetworkService,
    private errorService: ErrorService,
    private userStateService: UserStateService
  ) {}

  ngOnInit() {
    this.initializeClubData();
  }

  ionViewWillEnter() {
    this.refreshClubPageData();
    // Reload events when navigating back to the page
    if (this.clubId) {
      this.loadClubEvents();
    }
  }

  /**
   * Initialize club data - called once on component init
   */
  private initializeClubData() {
    // Get the club ID from the route parameter
    this.clubId = this.route.snapshot.paramMap.get('id');

    // Check for tab query parameter
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam && ['feed', 'members', 'events'].includes(tabParam)) {
      this.selectedTab = tabParam as 'feed' | 'members' | 'events';
    }

    // Subscribe to network status changes
    this.setupNetworkMonitoring();

    // Subscribe to user changes for global profile updates
    this.setupUserStateMonitoring();

    if (this.clubId) {
      this.fetchClubData(this.clubId);
      // Check user's membership status after getting club ID
      this.checkMembershipStatus();
      console.log('rgdb covertp[htop', this.club.coverPhotoUrl);
    } else {
      this.currentError = {
        type: 'validation',
        message: 'No club ID provided',
        userMessage: 'Invalid club ID provided',
        retryable: false,
      };
      this.showErrorToast('Invalid club ID');
    }
  }

  /**
   * Refresh club page data - called when navigating back to the page
   */
  private refreshClubPageData() {
    if (this.clubId) {
      this.fetchClubData(this.clubId);
      this.checkMembershipStatus();
    }
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());

    // Clear any pending operations in error service
    this.errorService.clearQueue();
  }

  // --- REFRESH FUNCTIONALITY ---

  /**
   * Handle pull-to-refresh with comprehensive race condition prevention
   */
  async handleRefresh(event: any) {
    // Prevent multiple concurrent refresh operations
    if (this.operationLocks.refreshData || this.actionInProgress.refresh) {
      console.warn('Refresh operation already in progress');
      event.target.complete();
      return;
    }

    // Disable all actions during refresh
    this.operationLocks.refreshData = true;
    this.actionInProgress.refresh = true;
    this.isRefreshing = true;
    this.errorMessage = '';

    try {
      if (this.clubId) {
        // Cancel any pending debounced operations
        if (this.joinDebounceTimer) {
          clearTimeout(this.joinDebounceTimer);
          this.joinDebounceTimer = null;
        }

        // Wait for any critical operations to complete before refreshing
        await this.waitForCriticalOperations();

        // Clear pending requests that might conflict with refresh
        this.pendingRequests.clear();

        // Refresh all data concurrently
        const refreshPromises = [
          this.refreshClubData(),
          this.refreshMembershipStatus(),
        ];

        // If members tab is selected, refresh member data
        if (this.selectedTab === 'members') {
          refreshPromises.push(this.refreshMembersData());

          // Also refresh admin data if user is admin (for join requests in members tab)
          if (this.isUserAdmin) {
            refreshPromises.push(this.refreshAdminData());
          }
        }

        await Promise.all(refreshPromises);
      }
    } catch (error) {
      console.error('Error during refresh:', error);
      this.presentToast('Failed to refresh data', 'danger');
    } finally {
      // Clean up state
      this.operationLocks.refreshData = false;
      this.actionInProgress.refresh = false;
      this.isRefreshing = false;
      event.target.complete();
    }
  }

  /**
   * Wait for critical operations to complete before allowing refresh
   */
  private async waitForCriticalOperations(): Promise<void> {
    const maxWaitTime = 3000; // 3 seconds max wait
    const checkInterval = 100; // Check every 100ms
    let waitTime = 0;

    return new Promise((resolve) => {
      const checkOperations = () => {
        const criticalOperationsInProgress =
          this.operationLocks.joinClub ||
          this.operationLocks.membershipStatusCheck ||
          this.actionInProgress.join ||
          this.actionInProgress.adminActions;

        if (!criticalOperationsInProgress || waitTime >= maxWaitTime) {
          resolve();
        } else {
          waitTime += checkInterval;
          setTimeout(checkOperations, checkInterval);
        }
      };

      checkOperations();
    });
  }

  /**
   * Refresh club data without loading indicators
   */
  private async refreshClubData(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.clubId) {
        resolve();
        return;
      }

      this.clubService.getClubDetails(this.clubId).subscribe({
        next: (response) => {
          this.updateClubData(response);
          resolve();
        },
        error: (error) => {
          console.error('Error refreshing club data:', error);
          reject(error);
        },
      });
    });
  }

  /**
   * Refresh membership status without loading indicators
   */
  private async refreshMembershipStatus(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.clubId) {
        resolve();
        return;
      }

      this.clubService.getMembershipStatus(this.clubId).subscribe({
        next: (response) => {
          this.updateMembershipStatus(response);
          resolve();
        },
        error: (error) => {
          console.error('Error refreshing membership status:', error);
          // Don't reject on membership status errors, just default to not-member
          this.userStatus = 'not-member';
          resolve();
        },
      });
    });
  }

  /**
   * Refresh admin data (join requests and members)
   */
  private async refreshAdminData(): Promise<void> {
    if (!this.isUserAdmin || !this.clubId) return Promise.resolve();

    const refreshPromises = [
      this.refreshJoinRequests(),
      this.refreshClubMembers(),
    ];

    return Promise.all(refreshPromises).then(() => {});
  }

  /**
   * Refresh join requests
   */
  private async refreshJoinRequests(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.clubId) {
        resolve();
        return;
      }

      this.clubService.getJoinRequests(this.clubId).subscribe({
        next: (requests) => {
          this.joinRequests = requests.filter(
            (req) => req.status === 'pending'
          );
          resolve();
        },
        error: (error) => {
          console.error('Error refreshing join requests:', error);
          reject(error);
        },
      });
    });
  }

  /**
   * Refresh club members
   */
  private async refreshClubMembers(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.clubId) {
        resolve();
        return;
      }

      this.clubService.getClubMembers(this.clubId).subscribe({
        next: (members) => {
          this.clubMembers = members;
          resolve();
        },
        error: (error) => {
          console.error('Error refreshing club members:', error);
          reject(error);
        },
      });
    });
  }

  /**
   * Refresh members data for public display
   */
  private async refreshMembersData(): Promise<void> {
    try {
      await this.loadMembersForDisplay();
    } catch (error) {
      console.error('Error refreshing members data:', error);
      throw error;
    }
  }

  // --- NETWORK MONITORING ---
  private setupNetworkMonitoring() {
    // Subscribe to network status changes
    const networkSub = this.networkService.networkStatus.subscribe((status) => {
      this.networkStatus = status;

      // If we just came back online and have pending operations, process them
      if (status.online && this.errorService.getQueueLength() > 0) {
        this.presentToast(
          'Connection restored. Retrying operations...',
          'success'
        );
      }
    });

    // Subscribe to connection quality changes
    const qualitySub = this.networkService.connectionQuality.subscribe(
      (quality) => {
        this.connectionQuality = quality;

        // Show warning for poor connections
        if (quality.quality === 'poor' && this.networkStatus.online) {
          this.presentToast(
            'Slow connection detected. Some operations may take longer.',
            'warning'
          );
        }
      }
    );

    this.subscriptions.push(networkSub, qualitySub);
  }

  // --- USER STATE MONITORING ---
  private setupUserStateMonitoring() {
    // Subscribe to user state changes
    const userSub = this.userStateService.user$.subscribe((user) => {
      if (user && this.selectedTab === 'members') {
        // Refresh members list when user data changes and members tab is active
        this.refreshMembersData();
      }
    });

    this.subscriptions.push(userSub);
  }

  // --- API METHODS WITH ENHANCED ERROR HANDLING ---
  async fetchClubData(clubId: string) {
    const loading = await this.loadingController.create({
      message: 'Loading club details...',
      duration: this.networkService.getRecommendedTimeout(),
    });

    try {
      this.isLoading = true;
      this.errorMessage = '';
      this.operationErrors.clubData = null;
      this.currentError = null;
      await loading.present();

      // Use error service for retry logic
      const clubDataRequest = this.errorService
        .withRetry(this.clubService.getClubDetails(clubId), 'Fetch Club Data')
        .pipe(
          tap((response) => {
            console.log('Club data received:', response);
            this.updateClubData(response);
          }),
          finalize(() => {
            this.isLoading = false;
            loading.dismiss();
          })
        );

      const subscription = clubDataRequest.subscribe({
        next: (response) => {
          this.retryAttempts = 0; // Reset retry attempts on success
        },
        error: (error) => {
          const errorInfo = error as ErrorInfo;
          console.error('Error fetching club data:', errorInfo);

          this.operationErrors.clubData = errorInfo;
          this.currentError = errorInfo;
          this.errorMessage = errorInfo.userMessage;

          this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
        },
      });

      this.subscriptions.push(subscription);
    } catch (error) {
      console.error('Exception in fetchClubData:', error);
      const errorInfo = this.errorService.analyzeError(
        error,
        'Fetch Club Data'
      );
      this.operationErrors.clubData = errorInfo;
      this.currentError = errorInfo;
      this.errorMessage = errorInfo.userMessage;
      this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      this.isLoading = false;
      loading.dismiss();
    }
  }

  private updateClubData(response: any) {
    // Handle different response structures
    const clubData = response.club || response;

    this.club = {
      ...this.club,
      _id: clubData._id,
      id: clubData._id,
      name: clubData.clubName || clubData.name || 'Unnamed Club',
      clubName: clubData.clubName,
      location: clubData.location || 'Location not specified',
      memberCount: clubData.members ? clubData.members.length : 0,
      isPrivate: clubData.isPrivate || false,
      logoUrl:
        clubData.logoUrl ||
        'https://placehold.co/100x100/4A5568/FFFFFF?text=Logo',
      coverPhotoUrl:
        clubData.coverPhotoUrl ||
        'https://placehold.co/600x250/2D3748/FFFFFF?text=' + clubData.clubName,
      description: clubData.description,
      members: clubData.members,
      createdBy: clubData.createdBy,
      createdAt: clubData.createdAt,
    };
  }

  // Check user's membership status with enhanced error handling
  async checkMembershipStatus() {
    if (!this.clubId) {
      console.error('No club ID available for status check');
      return;
    }

    // Prevent concurrent membership status checks
    if (this.operationLocks.membershipStatusCheck) {
      console.warn('Membership status check already in progress');
      return;
    }

    try {
      this.operationLocks.membershipStatusCheck = true;
      this.statusLoading = true;
      this.operationErrors.membershipStatus = null;
      this.lastStatusCheckTime = Date.now();

      const requestKey = `status-${this.clubId}`;

      // Check if we already have a pending status request
      if (this.pendingRequests.has(requestKey)) {
        const existingRequest = this.pendingRequests.get(requestKey);
        await existingRequest;
        return;
      }

      // Use error service for retry logic
      const statusRequest = this.errorService
        .withRetry(
          this.clubService.getMembershipStatus(this.clubId),
          'Check Membership Status'
        )
        .pipe(
          tap((response) => {
            console.log('Membership status received:', response);
            this.updateMembershipStatus(response);
          }),
          finalize(() => {
            this.statusLoading = false;
            this.operationLocks.membershipStatusCheck = false;
          })
        );

      // Create promise for tracking
      const statusPromise = statusRequest.toPromise();
      this.pendingRequests.set(requestKey, statusPromise);

      try {
        await statusPromise;
        this.pendingRequests.delete(requestKey);
      } catch (error) {
        this.pendingRequests.delete(requestKey);

        const errorInfo = error as ErrorInfo;
        console.error('Error fetching membership status:', errorInfo);

        this.operationErrors.membershipStatus = errorInfo;

        // Handle specific error scenarios
        if (errorInfo.type === 'authorization') {
          this.userStatus = 'not-member';
          if (errorInfo.status === 401) {
            this.presentToast('Please log in to continue', 'warning');
          }
        } else if (errorInfo.status === 404) {
          this.userStatus = 'not-member';
          this.showErrorToast('Club not found');
        } else {
          // For other errors, default to not-member but show error
          console.warn('Defaulting to not-member status due to error');
          this.userStatus = 'not-member';

          // Only show error toast for retryable errors
          if (errorInfo.retryable) {
            this.showErrorToast('Unable to check membership status');
          }
        }
      }
    } catch (error) {
      console.error('Exception in checkMembershipStatus:', error);
      const errorInfo = this.errorService.analyzeError(
        error,
        'Check Membership Status'
      );
      this.operationErrors.membershipStatus = errorInfo;
      this.userStatus = 'not-member';
      this.statusLoading = false;
      this.operationLocks.membershipStatusCheck = false;
    }
  }

  private updateMembershipStatus(response: any) {
    // Update user status based on API response
    this.userStatus = response.status || 'not-member';

    // Store additional membership data
    this.membershipData = {
      role: response.role,
      joinRequestId: response.joinRequestId,
      memberSince: response.memberSince,
      permissions: response.permissions,
      memberId: response.memberId,
    };

    // If user is admin, preload admin data for better UX
    if (this.userStatus === 'admin' && !this.operationLocks.adminDataLoad) {
      this.preloadAdminData();
    }
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top',
    });
    toast.present();
  }

  // --- GETTERS FOR CLEANER TEMPLATES ---
  // Using getters makes the *ngIf conditions in the HTML more readable.
  get isUserAdmin(): boolean {
    return this.userStatus === 'admin';
  }

  get isUserMember(): boolean {
    return this.userStatus === 'admin' || this.userStatus === 'member';
  }

  get canViewContent(): boolean {
    // Users can view content if they are a member OR if the club is not private.
    // Also check if we have successfully loaded club data and membership status
    return (
      !this.isLoading &&
      !this.statusLoading &&
      this.club.name &&
      (this.isUserMember || !this.club.isPrivate)
    );
  }

  get hasError(): boolean {
    return !!this.currentError && !this.isLoading;
  }

  get hasNetworkError(): boolean {
    return !!this.currentError && this.currentError.type === 'network';
  }

  get hasServerError(): boolean {
    return !!this.currentError && this.currentError.type === 'server';
  }

  get showNetworkIndicator(): boolean {
    return (
      !this.networkStatus.online || this.connectionQuality.quality === 'poor'
    );
  }

  // --- EVENT HANDLERS ---
  // This function is called when the user taps on a different tab segment.
  segmentChanged(event: any) {
    this.selectedTab = event.detail.value;

    // Load member data when members tab is selected
    if (this.selectedTab === 'members') {
      this.loadMembersForDisplay();

      // Also load admin data (join requests) if user is admin
      if (this.isUserAdmin) {
        this.loadAdminData();
      }
    }

    // Load events when events tab is selected
    if (this.selectedTab === 'events') {
      this.loadClubEvents();
    }
  }

  // Join club functionality with comprehensive race condition prevention
  async joinClub() {
    // Debounce multiple rapid clicks
    if (this.joinDebounceTimer) {
      clearTimeout(this.joinDebounceTimer);
    }

    this.joinDebounceTimer = setTimeout(() => {
      this.processJoinClub();
    }, this.JOIN_DEBOUNCE_MS);
  }

  private async processJoinClub() {
    // Validate club ID
    if (!this.clubId) {
      this.showErrorToast('Invalid club ID');
      return;
    }

    // Check network connectivity first
    if (!this.networkStatus.online) {
      // Queue the operation for when network comes back
      this.presentToast(
        'No internet connection. Operation will be retried when connection is restored.',
        'warning'
      );

      try {
        const result = await this.errorService.queueOperation(
          () => this.clubService.joinClub(this.clubId!),
          'Join Club'
        );

        this.handleJoinSuccess(result);
      } catch (error) {
        const errorInfo = error as ErrorInfo;
        this.operationErrors.joinOperation = errorInfo;
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
      return;
    }

    // Prevent multiple simultaneous join attempts
    if (this.operationLocks.joinClub || this.actionInProgress.join) {
      console.warn(
        'Join operation already in progress, ignoring duplicate request'
      );
      return;
    }

    // Check if we have a pending request for this club
    const requestKey = `join-${this.clubId}`;
    if (this.pendingRequests.has(requestKey)) {
      console.warn('Join request already pending for this club');
      return;
    }

    // Validate current membership status before proceeding
    if (!(await this.validateMembershipStatusForJoin())) {
      return;
    }

    // Set locks to prevent race conditions
    this.operationLocks.joinClub = true;
    this.actionInProgress.join = true;
    this.joiningClub = true;
    this.operationErrors.joinOperation = null;

    // Determine loading message based on club privacy
    const loadingMessage = this.club?.isPrivate
      ? 'Sending join request...'
      : 'Joining club...';
    const loading = await this.loadingController.create({
      message: loadingMessage,
      duration: this.networkService.getRecommendedTimeout(),
    });

    try {
      await loading.present();

      // Use error service for retry logic
      const joinRequest = this.errorService
        .withRetry(this.clubService.joinClub(this.clubId), 'Join Club')
        .pipe(
          tap((response) => {
            console.log('Join club response:', response);
          }),
          finalize(() => {
            this.operationLocks.joinClub = false;
            this.actionInProgress.join = false;
            this.joiningClub = false;
            loading.dismiss();
          })
        );

      // Track the pending request
      const joinPromise = joinRequest.toPromise();
      this.pendingRequests.set(requestKey, joinPromise);

      // Wait for the join operation to complete
      const response: any = await joinPromise;

      this.handleJoinSuccess(response);
    } catch (error: any) {
      const errorInfo = error as ErrorInfo;
      console.error('Error joining club:', errorInfo);

      this.operationErrors.joinOperation = errorInfo;
      this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
    } finally {
      // Clean up tracking
      this.pendingRequests.delete(requestKey);
    }
  }

  private handleJoinSuccess(response: any) {
    // Enhanced success message based on response type
    if (response.instant) {
      // Public club - instant join
      this.presentToast('Successfully joined club!', 'success');
    } else {
      // Private club - join request sent
      this.presentToast(
        'Join request sent! Waiting for admin approval.',
        'primary'
      );
    }

    // Refresh data after successful join
    this.refreshDataAfterJoin();
  }

  // Validate membership status before attempting to join
  private async validateMembershipStatusForJoin(): Promise<boolean> {
    // Check if status was recently verified to avoid redundant checks
    const now = Date.now();
    if (now - this.lastStatusCheckTime < this.STATUS_CHECK_COOLDOWN_MS) {
      // Use cached status
      if (this.userStatus !== 'not-member') {
        this.showStatusBasedMessage();
        return false;
      }
      return true;
    }

    // Refresh membership status if needed
    if (!this.operationLocks.membershipStatusCheck) {
      await this.refreshMembershipStatus();
    }

    // Validate current status
    if (this.userStatus !== 'not-member') {
      this.showStatusBasedMessage();
      return false;
    }

    return true;
  }

  // Show appropriate message based on current membership status
  private showStatusBasedMessage() {
    switch (this.userStatus) {
      case 'member':
        this.presentToast('You are already a member of this club', 'warning');
        break;
      case 'admin':
        this.presentToast('You are already an admin of this club', 'warning');
        break;
      case 'pending':
        this.presentToast('Your join request is pending approval', 'primary');
        break;
    }
  }

  // Refresh data after successful join operation
  private async refreshDataAfterJoin(): Promise<void> {
    try {
      const refreshPromises = [
        this.refreshClubData(),
        this.refreshMembershipStatus(),
      ];

      await Promise.all(refreshPromises);
    } catch (error) {
      console.error('Error refreshing data after join:', error);
      // Don't throw error as join was successful
    }
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top',
    });
    toast.present();
  }

  // Enhanced toast method for different message types
  private async presentToast(
    message: string,
    color: 'success' | 'primary' | 'warning' | 'danger' = 'success'
  ) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top',
    });
    toast.present();
  }

  // --- SMART JOIN BUTTON LOGIC ---
  // Dynamic button text based on user status and club privacy
  getJoinButtonText(): string {
    if (this.statusLoading || this.joiningClub) {
      return this.joiningClub ? 'Processing...' : 'Checking...';
    }

    switch (this.userStatus) {
      case 'admin':
        return 'Manage';
      case 'member':
        return 'Member';
      case 'pending':
        return 'Request Pending';
      case 'not-member':
        return this.club?.isPrivate ? 'Request to Join' : 'Join';
      default:
        return 'Join';
    }
  }

  // Button disabled state logic
  isJoinButtonDisabled(): boolean {
    return (
      this.statusLoading ||
      this.joiningClub ||
      this.userStatus === 'member' ||
      this.userStatus === 'pending'
    );
  }

  // Button color logic based on status
  getJoinButtonColor(): string {
    if (this.statusLoading || this.joiningClub) {
      return 'medium';
    }

    switch (this.userStatus) {
      case 'admin':
        return 'success';
      case 'member':
        return 'medium';
      case 'pending':
        return 'medium';
      case 'not-member':
        return 'brand-amber';
      default:
        return 'brand-amber';
    }
  }

  // Button icon logic
  getJoinButtonIcon(): string {
    if (this.statusLoading || this.joiningClub) {
      return '';
    }

    switch (this.userStatus) {
      case 'admin':
        return 'settings-outline';
      case 'member':
        return 'checkmark-circle-outline';
      case 'pending':
        return 'time-outline';
      case 'not-member':
        return 'person-add-outline';
      default:
        return 'person-add-outline';
    }
  }

  // Check if button should show spinner
  shouldShowSpinner(): boolean {
    return this.statusLoading || this.joiningClub;
  }

  // Check if button is actionable (not just status display)
  isJoinButtonActionable(): boolean {
    return (
      this.userStatus === 'not-member' &&
      !this.statusLoading &&
      !this.joiningClub
    );
  }

  // Handle join button click - redirect to edit-club if admin, otherwise join club
  handleJoinButtonClick() {
    console.log(
      'rgdb - Join button clicked with status:',
      this.getJoinButtonText()
    );
    // If button text is "Manage", redirect to edit-club page
    if (this.getJoinButtonText() === 'Manage') {
      this.router.navigate(['/edit-club', this.clubId]);
      return;
    }

    // Otherwise, handle as normal join club action
    if (this.isJoinButtonActionable()) {
      this.joinClub();
    }
  }

  // --- ADMIN MANAGEMENT METHODS ---

  /**
   * Preload admin data silently in the background for better UX
   */
  private async preloadAdminData() {
    if (!this.isUserAdmin || !this.clubId || this.operationLocks.adminDataLoad)
      return;

    try {
      this.operationLocks.adminDataLoad = true;

      // Load admin data in background without showing loading indicators
      await Promise.all([
        this.loadJoinRequestsSilently(),
        this.loadClubMembersSilently(),
      ]);
    } catch (error) {
      console.error('Error preloading admin data:', error);
      // Don't show errors for background preloading
    } finally {
      this.operationLocks.adminDataLoad = false;
    }
  }

  /**
   * Load all admin data (join requests and members)
   */
  async loadAdminData() {
    if (!this.isUserAdmin || !this.clubId) return;

    // Load both join requests and members in parallel
    await Promise.all([this.loadJoinRequests(), this.loadClubMembers()]);
  }

  /**
   * Load pending join requests for the club
   */
  async loadJoinRequests() {
    if (!this.clubId) return;

    try {
      this.joinRequestsLoading = true;
      this.clubService.getJoinRequests(this.clubId).subscribe({
        next: (requests) => {
          this.joinRequests = requests.filter(
            (req) => req.status === 'pending'
          );
          this.joinRequestsLoading = false;
        },
        error: (error) => {
          console.error('Error loading join requests:', error);
          this.handleAdminError('Failed to load join requests', error);
          this.joinRequestsLoading = false;
        },
      });
    } catch (error) {
      console.error('Exception in loadJoinRequests:', error);
      this.joinRequestsLoading = false;
    }
  }

  /**
   * Load club members
   */
  async loadClubMembers() {
    if (!this.clubId) return;

    try {
      this.membersLoading = true;
      this.clubService.getClubMembers(this.clubId).subscribe({
        next: (members) => {
          this.clubMembers = members;
          this.membersLoading = false;
        },
        error: (error) => {
          console.error('Error loading club members:', error);
          this.handleAdminError('Failed to load members', error);
          this.membersLoading = false;
        },
      });
    } catch (error) {
      console.error('Exception in loadClubMembers:', error);
      this.membersLoading = false;
    }
  }

  /**
   * Load join requests silently in the background (no loading indicators)
   */
  private async loadJoinRequestsSilently(): Promise<void> {
    if (!this.clubId) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.clubService.getJoinRequests(this.clubId!).subscribe({
        next: (requests) => {
          this.joinRequests = requests.filter(
            (req) => req.status === 'pending'
          );
          resolve();
        },
        error: (error) => {
          console.error('Error silently loading join requests:', error);
          reject(error);
        },
      });
    });
  }

  /**
   * Load club members silently in the background (no loading indicators)
   */
  private async loadClubMembersSilently(): Promise<void> {
    if (!this.clubId) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.clubService.getClubMembers(this.clubId!).subscribe({
        next: (members) => {
          this.clubMembers = members;
          resolve();
        },
        error: (error) => {
          console.error('Error silently loading club members:', error);
          reject(error);
        },
      });
    });
  }

  /**
   * Load members for display in the members tab
   * This method handles both admin and non-admin member loading
   */
  async loadMembersForDisplay() {
    if (!this.clubId || this.membersDataLoading) return;

    try {
      this.membersDataLoading = true;
      this.memberError = null;

      // Try to get members data regardless of admin status
      // The API will return appropriate data based on user permissions
      this.clubService.getClubMembers(this.clubId).subscribe({
        next: (members) => {
          this.membersForPublicView = members;
          this.membersDataLoading = false;

          // If user is admin, also update the admin members list
          if (this.isUserAdmin) {
            this.clubMembers = [...members];
          }
        },
        error: (error) => {
          console.error('Error loading members via API:', error);

          // If API fails (likely due to permissions), try to extract from club data
          this.loadMembersFromClubData();
        },
      });
    } catch (error) {
      console.error('Exception in loadMembersForDisplay:', error);
      this.loadMembersFromClubData();
    }
  }

  /**
   * Fallback method to load member data from the club object
   */
  private loadMembersFromClubData() {
    try {
      if (this.club.members && this.club.members.length > 0) {
        // Map club.members to the expected format
        this.membersForPublicView = this.club.members.map((member: any) => ({
          _id:
            member._id || member.id || `member-${Date.now()}-${Math.random()}`,
          user: {
            _id: member.user?._id || member._id || member.id,
            name:
              member.user?.name || member.name || member.username || 'Member',
            email: member.user?.email || member.email || '',
            profilePicture:
              member.user?.profilePicture || member.profilePicture,
          },
          club: this.clubId!,
          role:
            member.role ||
            (member.roles &&
            member.roles.includes &&
            member.roles.includes('admin')
              ? 'admin'
              : 'member'),
          joinedAt:
            member.joinedDate || member.joinedAt || new Date().toISOString(),
        }));
      } else {
        // No member data available - show empty state
        this.membersForPublicView = [];
      }
    } catch (error) {
      console.error('Error parsing member data from club:', error);
      this.memberError = 'Unable to display member information';
      this.membersForPublicView = [];
    } finally {
      this.membersDataLoading = false;
    }
  }

  /**
   * Approve a join request
   */
  async approveRequest(request: JoinRequest) {
    const alert = await this.alertController.create({
      header: 'Approve Join Request',
      message: `Are you sure you want to approve ${request.user.name}'s request to join?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Approve',
          handler: () => {
            this.processJoinRequest(request, 'approve');
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Reject a join request
   */
  async rejectRequest(request: JoinRequest) {
    const alert = await this.alertController.create({
      header: 'Reject Join Request',
      message: `Are you sure you want to reject ${request.user.name}'s request to join?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Reject',
          cssClass: 'danger',
          handler: () => {
            this.processJoinRequest(request, 'reject');
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Process a join request (approve or reject) with race condition prevention
   */
  private async processJoinRequest(
    request: JoinRequest,
    action: 'approve' | 'reject'
  ) {
    if (!this.clubId) return;

    // Prevent concurrent processing of the same request
    if (this.processingRequests.has(request._id)) {
      console.warn(`Request ${request._id} is already being processed`);
      return;
    }

    // Prevent admin actions during other critical operations
    if (this.operationLocks.refreshData || this.actionInProgress.refresh) {
      this.presentToast(
        'Please wait for current operation to complete',
        'warning'
      );
      return;
    }

    const requestKey = `${action}-request-${request._id}`;

    // Check for duplicate operations
    if (this.pendingRequests.has(requestKey)) {
      console.warn(`Duplicate ${action} request detected for ${request._id}`);
      return;
    }

    try {
      this.processingRequests.add(request._id);
      this.actionInProgress.adminActions = true;

      // Create operation promise
      const operationPromise = new Promise((resolve, reject) => {
        const serviceCall =
          action === 'approve'
            ? this.clubService.approveJoinRequest(this.clubId!, request._id)
            : this.clubService.rejectJoinRequest(this.clubId!, request._id);

        serviceCall.subscribe({
          next: (response) => {
            resolve(response);
          },
          error: (error) => {
            reject(error);
          },
        });
      });

      // Track the pending request
      this.pendingRequests.set(requestKey, operationPromise);

      // Wait for operation to complete
      await operationPromise;

      const actionText = action === 'approve' ? 'approved' : 'rejected';
      this.presentToast(
        `Successfully ${actionText} ${request.user.name}'s request`,
        'success'
      );

      // Remove the request from the list
      this.joinRequests = this.joinRequests.filter(
        (req) => req._id !== request._id
      );

      // If approved, refresh member count and members list without conflicts
      if (action === 'approve') {
        await this.safeRefreshAfterMemberChange();
      }
    } catch (error: any) {
      console.error(`Error ${action}ing join request:`, error);
      this.handleAdminError(`Failed to ${action} request`, error);
    } finally {
      // Clean up state
      this.processingRequests.delete(request._id);
      this.actionInProgress.adminActions = false;
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Safely refresh data after member changes without causing race conditions
   */
  private async safeRefreshAfterMemberChange(): Promise<void> {
    try {
      // Only refresh if no other refresh operations are in progress
      if (!this.operationLocks.refreshData && !this.actionInProgress.refresh) {
        await Promise.all([this.refreshClubData(), this.refreshClubMembers()]);
      }
    } catch (error) {
      console.error('Error during safe refresh:', error);
    }
  }

  /**
   * Show member actions menu
   */
  async presentMemberActions(member: ClubMember) {
    // Don't allow actions on self or if processing
    const currentUserId = this.membershipData.memberId;
    if (
      member._id === currentUserId ||
      this.processingMembers.has(member._id)
    ) {
      return;
    }

    const buttons = [];

    // Role management buttons
    if (member.role === 'member') {
      buttons.push({
        text: 'Promote to Admin',
        icon: 'arrow-up-outline',
        handler: () => {
          this.promoteToAdmin(member);
        },
      });
    } else if (member.role === 'admin') {
      buttons.push({
        text: 'Demote to Member',
        icon: 'arrow-down-outline',
        handler: () => {
          this.demoteToMember(member);
        },
      });
    }

    // Remove member button
    buttons.push({
      text: 'Remove from Club',
      icon: 'person-remove-outline',
      role: 'destructive',
      handler: () => {
        this.removeMemberFromClub(member);
      },
    });

    // Cancel button
    buttons.push({
      text: 'Cancel',
      icon: 'close-outline',
      role: 'cancel',
    });

    const actionSheet = await this.actionSheetController.create({
      header: `Manage ${member.user.name}`,
      buttons: buttons,
      cssClass: 'dark-theme-action-sheet',
    });

    await actionSheet.present();
  }

  /**
   * Promote member to admin
   */
  async promoteToAdmin(member: ClubMember) {
    const alert = await this.alertController.create({
      header: 'Promote to Admin',
      message: `Are you sure you want to promote ${member.user.name} to admin?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Promote',
          handler: () => {
            this.processMemberRoleChange(member, 'promote');
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Demote admin to member
   */
  async demoteToMember(member: ClubMember) {
    const alert = await this.alertController.create({
      header: 'Demote to Member',
      message: `Are you sure you want to demote ${member.user.name} to member?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Demote',
          cssClass: 'warning',
          handler: () => {
            this.processMemberRoleChange(member, 'demote');
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Remove member from club
   */
  async removeMemberFromClub(member: ClubMember) {
    const alert = await this.alertController.create({
      header: 'Remove Member',
      message: `Are you sure you want to remove ${member.user.name} from the club? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Remove',
          cssClass: 'danger',
          handler: () => {
            this.processMemberRemoval(member);
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Process member role change (promote/demote) with race condition prevention
   */
  private async processMemberRoleChange(
    member: ClubMember,
    action: 'promote' | 'demote'
  ) {
    if (!this.clubId) return;

    // Prevent concurrent processing of the same member
    if (this.processingMembers.has(member._id)) {
      console.warn(`Member ${member._id} is already being processed`);
      return;
    }

    // Prevent admin actions during other critical operations
    if (this.operationLocks.refreshData || this.actionInProgress.refresh) {
      this.presentToast(
        'Please wait for current operation to complete',
        'warning'
      );
      return;
    }

    const requestKey = `${action}-member-${member._id}`;

    // Check for duplicate operations
    if (this.pendingRequests.has(requestKey)) {
      console.warn(
        `Duplicate ${action} member request detected for ${member._id}`
      );
      return;
    }

    try {
      this.processingMembers.add(member._id);
      this.actionInProgress.adminActions = true;

      // Create operation promise
      const operationPromise = new Promise((resolve, reject) => {
        const serviceCall =
          action === 'promote'
            ? this.clubService.promoteToAdmin(this.clubId!, member._id)
            : this.clubService.demoteToMember(this.clubId!, member._id);

        serviceCall.subscribe({
          next: (response) => {
            resolve(response);
          },
          error: (error) => {
            reject(error);
          },
        });
      });

      // Track the pending request
      this.pendingRequests.set(requestKey, operationPromise);

      // Wait for operation to complete
      await operationPromise;

      const actionText = action === 'promote' ? 'promoted' : 'demoted';
      const newRole = action === 'promote' ? 'admin' : 'member';

      this.presentToast(
        `Successfully ${actionText} ${member.user.name}`,
        'success'
      );

      // Update the member role locally
      const memberIndex = this.clubMembers.findIndex(
        (m) => m._id === member._id
      );
      if (memberIndex !== -1) {
        this.clubMembers[memberIndex].role = newRole;
      }
    } catch (error: any) {
      console.error(`Error ${action}ing member:`, error);
      this.handleAdminError(`Failed to ${action} member`, error);
    } finally {
      // Clean up state
      this.processingMembers.delete(member._id);
      this.actionInProgress.adminActions = false;
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Process member removal with race condition prevention
   */
  private async processMemberRemoval(member: ClubMember) {
    if (!this.clubId) return;

    // Prevent concurrent processing of the same member
    if (this.processingMembers.has(member._id)) {
      console.warn(`Member ${member._id} is already being processed`);
      return;
    }

    // Prevent admin actions during other critical operations
    if (this.operationLocks.refreshData || this.actionInProgress.refresh) {
      this.presentToast(
        'Please wait for current operation to complete',
        'warning'
      );
      return;
    }

    const requestKey = `remove-member-${member._id}`;

    // Check for duplicate operations
    if (this.pendingRequests.has(requestKey)) {
      console.warn(
        `Duplicate remove member request detected for ${member._id}`
      );
      return;
    }

    try {
      this.processingMembers.add(member._id);
      this.actionInProgress.adminActions = true;

      // Create operation promise
      const operationPromise = new Promise((resolve, reject) => {
        this.clubService.removeMember(this.clubId!, member._id).subscribe({
          next: (response) => {
            resolve(response);
          },
          error: (error) => {
            reject(error);
          },
        });
      });

      // Track the pending request
      this.pendingRequests.set(requestKey, operationPromise);

      // Wait for operation to complete
      await operationPromise;

      this.presentToast(`Successfully removed ${member.user.name}`, 'success');

      // Remove member from local list
      this.clubMembers = this.clubMembers.filter((m) => m._id !== member._id);

      // Safely refresh club data for updated member count
      await this.safeRefreshAfterMemberChange();
    } catch (error: any) {
      console.error('Error removing member:', error);
      this.handleAdminError('Failed to remove member', error);
    } finally {
      // Clean up state
      this.processingMembers.delete(member._id);
      this.actionInProgress.adminActions = false;
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Handle admin operation errors with enhanced error analysis
   */
  private handleAdminError(message: string, error: any) {
    const errorInfo = this.errorService.analyzeError(error, 'Admin Operation');
    this.operationErrors.adminOperations = errorInfo;

    const errorMessage = this.errorService.createErrorMessage(errorInfo);
    this.presentToast(
      errorMessage,
      this.errorService.getErrorColor(errorInfo) as any
    );
  }

  // --- RETRY AND RECOVERY METHODS ---

  /**
   * Retry the main club data loading operation
   */
  async retryFetchClubData() {
    if (!this.clubId || this.isRetrying) return;

    this.isRetrying = true;
    this.retryAttempts++;

    try {
      await this.fetchClubData(this.clubId);
    } finally {
      this.isRetrying = false;
    }
  }

  /**
   * Retry checking membership status
   */
  async retryMembershipStatus() {
    if (this.isRetrying) return;

    this.isRetrying = true;

    try {
      await this.checkMembershipStatus();
    } finally {
      this.isRetrying = false;
    }
  }

  /**
   * Retry the join operation
   */
  async retryJoinClub() {
    if (this.isRetrying) return;

    this.isRetrying = true;

    try {
      await this.processJoinClub();
    } finally {
      this.isRetrying = false;
    }
  }

  /**
   * Clear all errors and retry all failed operations
   */
  async retryAllOperations() {
    if (this.isRetrying) return;

    this.isRetrying = true;
    this.currentError = null;
    this.operationErrors = {
      clubData: null,
      membershipStatus: null,
      joinOperation: null,
      adminOperations: null,
    };

    const retryPromises = [];

    if (this.clubId) {
      retryPromises.push(this.fetchClubData(this.clubId));
      retryPromises.push(this.checkMembershipStatus());
    }

    try {
      await Promise.allSettled(retryPromises);
      this.presentToast('Operations retried successfully', 'success');
    } catch (error) {
      console.error('Error during retry all operations:', error);
    } finally {
      this.isRetrying = false;
    }
  }

  /**
   * Check if a specific operation can be retried
   */
  canRetryOperation(operation: keyof typeof this.operationErrors): boolean {
    const error = this.operationErrors[operation];
    return !!error && error.retryable && !this.isRetrying;
  }

  /**
   * Get error info for display
   */
  getOperationError(
    operation: keyof typeof this.operationErrors
  ): ErrorInfo | null {
    return this.operationErrors[operation];
  }

  /**
   * Check network connectivity manually
   */
  async checkNetworkConnectivity() {
    try {
      const isOnline = await this.networkService.checkConnectivity();
      if (isOnline) {
        this.presentToast('Connection restored!', 'success');
      } else {
        this.presentToast('Still no internet connection', 'warning');
      }
    } catch (error) {
      this.presentToast('Unable to check connectivity', 'danger');
    }
  }

  /**
   * Check if a join request is being processed
   */
  isRequestProcessing(requestId: string): boolean {
    return this.processingRequests.has(requestId);
  }

  /**
   * Check if a member is being processed
   */
  isMemberProcessing(memberId: string): boolean {
    return this.processingMembers.has(memberId);
  }

  /**
   * Get display name (firstName + lastName or fallback to username/name)
   */
  getDisplayName(user: any): string {
    console.log('rgdb user ', user);
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`.trim();
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    } else if (user.name) {
      return user.name;
    }
    return 'Unknown User';
  }

  /**
   * Get avatar URL with fallback
   */
  getAvatarUrl(profilePicture?: string, name?: string): string {
    if (profilePicture) {
      return profilePicture;
    }
    // Create initials-based placeholder
    const initials = name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '??';
    return `https://placehold.co/80x80/718096/FFFFFF?text=${initials}`;
  }

  // --- EVENTS MANAGEMENT METHODS ---

  /**
   * Load events for the current club
   */
  async loadClubEvents() {
    if (!this.clubId || this.eventsLoading) return;

    try {
      this.eventsLoading = true;
      this.eventsError = null;

      this.eventService.getEventsByClub(this.clubId).subscribe({
        next: (events) => {
          this.clubEvents = events;
          this.eventsLoading = false;
        },
        error: (error) => {
          console.error('Error loading club events:', error);
          this.eventsError = 'Failed to load events';
          this.eventsLoading = false;
        },
      });
    } catch (error) {
      console.error('Exception in loadClubEvents:', error);
      this.eventsError = 'Failed to load events';
      this.eventsLoading = false;
    }
  }

  /**
   * Handle pull-to-refresh for events tab
   */
  async handleRefreshEvents(event: any) {
    if (!this.clubId) {
      event.target.complete();
      return;
    }

    try {
      await this.eventService.refreshClubEvents(this.clubId);
      this.presentToast('Events refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing events:', error);
      this.presentToast('Failed to refresh events', 'danger');
    } finally {
      event.target.complete();
    }
  }

  /**
   * Get event type display text
   */
  getEventTypeDisplay(eventType: string): string {
    const typeMap: { [key: string]: string } = {
      ride: 'RIDE',
      meeting: 'MEETING',
      meetup: 'MEETUP',
      event: 'EVENT',
    };
    return typeMap[eventType] || eventType.toUpperCase();
  }

  /**
   * Format event date for display
   */
  formatEventDate(date: Date | string): string {
    const eventDate = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return eventDate.toLocaleDateString('en-US', options);
  }

  /**
   * Navigate to create event page with current club ID
   */
  async navigateToCreateEvent() {
    if (!this.clubId) {
      this.presentToast(
        'Unable to create event: Club ID not available',
        'danger'
      );
      return;
    }

    try {
      console.log('Navigating to create event with clubId:', this.clubId);
      const success = await this.router.navigate([
        '/create-event',
        this.clubId,
      ]);
      if (!success) {
        console.error('Navigation failed');
        this.presentToast('Unable to navigate to create event page', 'danger');
      }
    } catch (error) {
      console.error('Error navigating to create event:', error);
      this.presentToast('Unable to navigate to create event page', 'danger');
    }
  }

  /**
   * Navigate to edit club page with current club ID
   */
  async navigateToEditClub() {
    if (!this.clubId) {
      this.presentToast('Unable to edit club: Club ID not available', 'danger');
      return;
    }

    if (!this.isUserAdmin) {
      this.presentToast('Access denied: Admin privileges required', 'danger');
      return;
    }

    try {
      console.log('Navigating to edit club with clubId:', this.clubId);
      const success = await this.router.navigate(['/edit-club', this.clubId]);
      if (!success) {
        console.error('Navigation failed');
        this.presentToast('Unable to navigate to edit club page', 'danger');
      }
    } catch (error) {
      console.error('Error navigating to edit club:', error);
      this.presentToast('Unable to navigate to edit club page', 'danger');
    }
  }

  // --- MODAL MANAGEMENT METHODS ---

  /**
   * Open members management modal and load member data
   */
  async openMembersModal() {
    if (!this.isUserAdmin) {
      this.presentToast('Access denied: Admin privileges required', 'danger');
      return;
    }

    this.showMembersModal = true;

    // Load admin data when modal opens (if not already loaded)
    if (this.clubMembers.length === 0 && !this.membersLoading) {
      await this.loadAdminData();
    }
  }

  /**
   * Close members management modal
   */
  closeMembersModal() {
    this.showMembersModal = false;
  }

  // --- ERROR DISPLAY HELPERS ---

  /**
   * Get the appropriate error icon for display
   */
  getErrorIcon(errorInfo?: ErrorInfo): string {
    if (!errorInfo) return 'alert-circle-outline';
    return this.errorService.getErrorIcon(errorInfo);
  }

  /**
   * Get the appropriate error color for display
   */
  getErrorColor(errorInfo?: ErrorInfo): string {
    if (!errorInfo) return 'danger';
    return this.errorService.getErrorColor(errorInfo);
  }

  /**
   * Get a user-friendly error message
   */
  getErrorMessage(errorInfo?: ErrorInfo): string {
    if (!errorInfo) return 'An unexpected error occurred';
    return this.errorService.createErrorMessage(errorInfo);
  }

  /**
   * Check if retry button should be shown for an error
   */
  shouldShowRetryButton(errorInfo?: ErrorInfo): boolean {
    if (!errorInfo) return false;
    return this.errorService.shouldShowRetry(errorInfo);
  }
}
