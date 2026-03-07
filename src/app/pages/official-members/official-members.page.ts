import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import {
  OfficialMember,
  OfficialMemberVisibility,
  VisibilityOption,
  PaginationInfo
} from '../../models/official-member.model';
import { OfficialMemberService } from '../../service/official-member.service';
import { ClubService } from '../../service/club.service';
import {
  ToastController,
  LoadingController,
  AlertController,
  ActionSheetController,
  ModalController
} from '@ionic/angular';
import {
  NetworkService,
  NetworkStatus
} from '../../service/network.service';
import { ErrorService, ErrorInfo } from '../../service/error.service';
import { CsvImportModalComponent } from '../../components/csv-import-modal/csv-import-modal.component';
import { Subscription, debounceTime, Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-official-members',
  templateUrl: './official-members.page.html',
  styleUrls: ['./official-members.page.scss'],
})
export class OfficialMembersPage implements OnInit, OnDestroy, ViewWillEnter {
  // --- STATE MANAGEMENT ---
  clubId: string | null = null;
  clubName: string = '';

  // Members data
  members: OfficialMember[] = [];

  // Loading and error states
  loading: boolean = false;
  isRefreshing: boolean = false;
  error: string = '';
  currentError: ErrorInfo | null = null;

  // User permissions
  isAdmin: boolean = false;
  visibility: VisibilityOption = 'public';

  // Pagination
  pagination: PaginationInfo = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  };

  // Search and filters
  searchQuery: string = '';
  filters: {
    isActive?: boolean;
    isClaimed?: boolean;
  } = {};

  // Search debouncer
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  // Network status
  networkStatus: NetworkStatus = { online: true };

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  // Track ongoing operations to prevent race conditions
  operationLocks = {
    loadMembers: false,
    deleteMember: false,
    export: false,
    import: false
  };

  // Processing members set
  processingMembers: Set<string> = new Set();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private officialMemberService: OfficialMemberService,
    private clubService: ClubService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private networkService: NetworkService,
    private errorService: ErrorService
  ) {}

  ngOnInit() {
    this.setupSearchDebouncer();
    this.setupNetworkMonitoring();

    // Get club ID from route parameter
    this.clubId = this.route.snapshot.paramMap.get('clubId');

    if (this.clubId) {
      this.checkAdminStatus();
      this.loadVisibility();
    } else {
      this.showError('Invalid club ID provided');
    }
  }

  ionViewWillEnter() {
    // Refresh members when navigating back to the page
    if (this.clubId) {
      this.loadMembers();
    }
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());

    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    this.searchSubject.complete();
  }

  // --- SETUP METHODS ---

  /**
   * Setup search debouncer to prevent excessive API calls
   */
  private setupSearchDebouncer() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(250)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring() {
    const networkSub = this.networkService.networkStatus.subscribe(
      (status) => {
        this.networkStatus = status;
      }
    );

    this.subscriptions.push(networkSub);
  }

  // --- DATA LOADING METHODS ---

  /**
   * Load members with current pagination and filters
   */
  loadMembers() {
    if (!this.clubId || this.operationLocks.loadMembers) return;

    this.loading = true;
    this.error = '';
    this.currentError = null;
    this.operationLocks.loadMembers = true;

    this.officialMemberService.getOfficialMembers(
      this.clubId,
      {
        page: this.pagination.page,
        limit: this.pagination.limit
      }
    ).pipe(
      finalize(() => {
        this.loading = false;
        this.operationLocks.loadMembers = false;
      })
    ).subscribe({
      next: (response) => {
        this.members = response.data;
        this.pagination = response.pagination;
      },
      error: (error) => {
        console.error('Error loading members:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Load Members');
        this.currentError = errorInfo;
        this.error = errorInfo.userMessage;
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * Load club name for display
   */
  private loadClubName() {
    if (!this.clubId) return;

    this.clubService.getClubDetails(this.clubId).subscribe({
      next: (response) => {
        const clubData = response.club || response;
        this.clubName = clubData.clubName || clubData.name || 'Club';
      },
      error: (error) => {
        console.error('Error loading club name:', error);
        this.clubName = 'Club';
      }
    });
  }

  /**
   * Check if current user is admin
   */
  private checkAdminStatus() {
    if (!this.clubId) return;

    this.clubService.getMembershipStatus(this.clubId).subscribe({
      next: (response) => {
        this.isAdmin = response.status === 'admin';
        if (this.isAdmin) {
          this.loadClubName();
        }
      },
      error: (error) => {
        console.error('Error checking admin status:', error);
        this.isAdmin = false;
      }
    });
  }

  /**
   * Load visibility setting
   */
  private loadVisibility() {
    if (!this.clubId) return;

    this.officialMemberService.getVisibility(this.clubId).subscribe({
      next: (response) => {
        this.visibility = response.visibility;
      },
      error: (error) => {
        console.error('Error loading visibility:', error);
        this.visibility = 'public'; // Default to public
      }
    });
  }

  /**
   * Check if user can view members based on visibility
   */
  canViewMembers(): boolean {
    if (this.visibility === 'public') return true;
    if (this.visibility === 'members') return this.isAdmin; // Simplified check
    if (this.visibility === 'admins') return this.isAdmin;
    return false;
  }

  // --- SEARCH AND FILTER METHODS ---

  /**
   * Trigger search with debouncing
   */
  searchMembers(query: string) {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  /**
   * Perform the actual search
   */
  private performSearch(query: string) {
    if (!this.clubId) return;

    // Reset pagination for search
    this.pagination.page = 1;

    if (!query.trim()) {
      // If query is empty, load all members
      this.loadMembers();
      return;
    }

    this.loading = true;
    this.error = '';

    this.officialMemberService.searchOfficialMembers(
      this.clubId,
      {
        q: query,
        page: this.pagination.page,
        limit: this.pagination.limit
      }
    ).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (members) => {
        this.members = members;
        // Note: Search endpoint returns array, not paginated response
        // Reset pagination based on results
        this.pagination.total = members.length;
      },
      error: (error) => {
        console.error('Error searching members:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Search Members');
        this.error = errorInfo.userMessage;
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * Apply filters and reload members
   */
  applyFilters() {
    if (!this.clubId) return;

    // Reset pagination when filters change
    this.pagination.page = 1;

    this.loading = true;
    this.error = '';

    this.officialMemberService.filterOfficialMembers(
      this.clubId,
      {
        ...this.filters,
        page: this.pagination.page,
        limit: this.pagination.limit
      }
    ).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (members) => {
        this.members = members;
        // Note: Filter endpoint returns array, not paginated response
        this.pagination.total = members.length;
      },
      error: (error) => {
        console.error('Error filtering members:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Filter Members');
        this.error = errorInfo.userMessage;
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * Clear all filters and search
   */
  clearFilters() {
    this.searchQuery = '';
    this.filters = {};
    this.pagination.page = 1;
    this.loadMembers();
  }

  // --- REFRESH METHODS ---

  /**
   * Handle pull-to-refresh
   */
  async refreshMembers(event: any) {
    if (this.operationLocks.loadMembers) {
      event.target.complete();
      return;
    }

    try {
      // Reload all data
      await Promise.all([
        this.loadMembers(),
        this.isAdmin ? this.loadClubName() : Promise.resolve(),
        this.loadVisibility()
      ]);

      this.presentToast('Members refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing members:', error);
      this.presentToast('Failed to refresh members', 'danger');
    } finally {
      event.target.complete();
    }
  }

  // --- PAGINATION METHODS ---

  /**
   * Load next page
   */
  loadNextPage() {
    if (this.pagination.page >= this.pagination.pages) return;

    this.pagination.page++;
    this.loadMembers();
  }

  /**
   * Load previous page
   */
  loadPreviousPage() {
    if (this.pagination.page <= 1) return;

    this.pagination.page--;
    this.loadMembers();
  }

  /**
   * Check if there's a next page
   */
  get hasNextPage(): boolean {
    return this.pagination.page < this.pagination.pages;
  }

  /**
   * Check if there's a previous page
   */
  get hasPreviousPage(): boolean {
    return this.pagination.page > 1;
  }

  // --- MEMBER DETAIL METHODS ---

  /**
   * Open member detail page
   */
  async openMemberDetail(memberId: string) {
    if (!this.clubId) return;

    try {
      const success = await this.router.navigate(['/official-member-detail', this.clubId, memberId]);
      if (!success) {
        console.error('Navigation to member detail failed');
        this.presentToast('Unable to open member details', 'danger');
      }
    } catch (error) {
      console.error('Error navigating to member detail:', error);
      this.presentToast('Unable to open member details', 'danger');
    }
  }

  // --- ADMIN METHODS ---

  /**
   * Open add member modal
   */
  async openAddMemberModal() {
    if (!this.isAdmin) {
      this.presentToast('Access denied: Admin privileges required', 'danger');
      return;
    }

    // TODO: Create add member modal component
    this.presentToast('Add member modal coming soon', 'primary');
  }

  /**
   * Open import modal
   */
  async openImportModal() {
    if (!this.isAdmin) {
      this.presentToast('Access denied: Admin privileges required', 'danger');
      return;
    }

    if (!this.networkStatus.online) {
      this.presentToast('No internet connection. Please check your connection and try again.', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: CsvImportModalComponent,
      componentProps: { clubId: this.clubId }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        // Refresh members list after successful import
        this.loadMembers();
      }
    });

    await modal.present();
  }

  /**
   * Export members to CSV
   */
  async exportToCSV() {
    if (!this.isAdmin) {
      this.presentToast('Access denied: Admin privileges required', 'danger');
      return;
    }

    if (!this.clubId || this.operationLocks.export) return;

    const loading = await this.loadingController.create({
      message: 'Exporting members to CSV...',
      duration: this.networkService.getRecommendedTimeout(),
    });

    try {
      this.operationLocks.export = true;
      await loading.present();

      this.officialMemberService.exportToCSV(this.clubId).pipe(
        finalize(() => {
          this.operationLocks.export = false;
          loading.dismiss();
        })
      ).subscribe({
        next: (blob) => {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `official-members-${this.clubName}-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.presentToast('Members exported successfully', 'success');
        },
        error: (error) => {
          console.error('Error exporting CSV:', error);
          const errorInfo = this.errorService.analyzeError(error, 'Export CSV');
          this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
        }
      });
    } catch (error) {
      console.error('Exception in exportToCSV:', error);
      this.operationLocks.export = false;
      loading.dismiss();
    }
  }

  /**
   * Delete member with confirmation
   */
  async deleteMember(member: OfficialMember) {
    if (!this.isAdmin) {
      this.presentToast('Access denied: Admin privileges required', 'danger');
      return;
    }

    if (!this.clubId || this.processingMembers.has(member._id)) return;

    const alert = await this.alertController.create({
      header: 'Delete Official Member',
      message: `Are you sure you want to delete ${member.firstName} ${member.lastName} (#${member.officialNumber})? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: () => {
            this.processMemberDeletion(member);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Process member deletion
   */
  private processMemberDeletion(member: OfficialMember) {
    if (!this.clubId) return;

    // Prevent concurrent deletion of same member
    if (this.processingMembers.has(member._id)) {
      console.warn(`Member ${member._id} is already being processed`);
      return;
    }

    this.processingMembers.add(member._id);

    this.officialMemberService.deleteOfficialMember(this.clubId, member._id).pipe(
      finalize(() => {
        this.processingMembers.delete(member._id);
      })
    ).subscribe({
      next: (response) => {
        this.presentToast(`Successfully deleted ${member.firstName} ${member.lastName}`, 'success');

        // Remove member from local list
        this.members = this.members.filter(m => m._id !== member._id);

        // Update pagination total
        this.pagination.total = Math.max(0, this.pagination.total - 1);
      },
      error: (error) => {
        console.error('Error deleting member:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Delete Member');
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  // --- UTILITY METHODS ---

  /**
   * Get member initials for avatar placeholder
   */
  getMemberInitials(member: OfficialMember): string {
    const first = member.firstName?.charAt(0) || '';
    const last = member.lastName?.charAt(0) || '';
    return (first + last).toUpperCase().slice(0, 2);
  }

  /**
   * Get member photo URL with fallback
   */
  getMemberPhoto(member: OfficialMember): string {
    if (member.photoUrl) {
      return member.photoUrl;
    }

    const initials = this.getMemberInitials(member);
    return `https://placehold.co/80x80/718096/FFFFFF?text=${initials}`;
  }

  /**
   * Get claim status display
   */
  getClaimStatus(member: OfficialMember): { text: string; color: string } {
    if (member.claimedBy) {
      return { text: 'Claimed', color: 'success' };
    }
    return { text: 'Unclaimed', color: 'medium' };
  }

  /**
   * Get active status display
   */
  getActiveStatus(member: OfficialMember): { text: string; color: string } {
    if (member.isActive) {
      return { text: 'Active', color: 'success' };
    }
    return { text: 'Inactive', color: 'danger' };
  }

  /**
   * Show error message
   */
  private showError(message: string) {
    this.error = message;
    this.showErrorToast(message);
  }

  /**
   * Show error toast
   */
  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    toast.present();
  }

  /**
   * Show success toast
   */
  private async presentToast(
    message: string,
    color: 'success' | 'primary' | 'warning' | 'danger' = 'success'
  ) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  /**
   * Navigate back to club home
   */
  navigateBack() {
    if (this.clubId) {
      this.router.navigate(['/clubs', this.clubId]);
    } else {
      this.router.navigate(['/home']);
    }
  }

  /**
   * Navigate to claim requests page (admin only)
   */
  navigateToClaimRequests() {
    if (!this.isAdmin) {
      this.presentToast('Access denied: Admin privileges required', 'danger');
      return;
    }

    if (!this.clubId) return;

    try {
      this.router.navigate(['/claim-requests', this.clubId]);
    } catch (error) {
      console.error('Error navigating to claim requests:', error);
      this.presentToast('Unable to navigate to claim requests', 'danger');
    }
  }

  /**
   * Check if there are no members to display
   */
  get isEmpty(): boolean {
    return !this.loading && this.members.length === 0 && !this.error;
  }

  /**
   * Check if there are active filters
   */
  get hasActiveFilters(): boolean {
    return !!this.searchQuery ||
           this.filters.isActive !== undefined ||
           this.filters.isClaimed !== undefined;
  }

  /**
   * Get visibility badge color
   */
  getVisibilityBadgeColor(): string {
    switch (this.visibility) {
      case 'public': return 'success';
      case 'members': return 'primary';
      case 'admins': return 'warning';
      default: return 'medium';
    }
  }

  /**
   * Get visibility display text
   */
  getVisibilityDisplay(): string {
    switch (this.visibility) {
      case 'public': return 'Public';
      case 'members': return 'Members Only';
      case 'admins': return 'Admins Only';
      default: return 'Unknown';
    }
  }

  /**
   * Check if member is being processed
   */
  isMemberProcessing(memberId: string): boolean {
    return this.processingMembers.has(memberId);
  }

  /**
   * Get page info display text
   */
  getPageInfoDisplay(): string {
    if (this.pagination.pages === 0) return 'No members';
    return `Page ${this.pagination.page} of ${this.pagination.pages} (${this.pagination.total} total)`;
  }

  /**
   * Toggle active filter
   */
  toggleActiveFilter() {
    if (this.filters.isActive === undefined) {
      this.filters.isActive = true;
    } else if (this.filters.isActive === true) {
      this.filters.isActive = false;
    } else {
      this.filters.isActive = undefined;
    }
    this.applyFilters();
  }

  /**
   * Toggle claimed filter
   */
  toggleClaimedFilter() {
    if (this.filters.isClaimed === undefined) {
      this.filters.isClaimed = true;
    } else if (this.filters.isClaimed === true) {
      this.filters.isClaimed = false;
    } else {
      this.filters.isClaimed = undefined;
    }
    this.applyFilters();
  }

  /**
   * Get active filter button text
   */
  getActiveFilterText(): string {
    if (this.filters.isActive === true) return 'Active Only';
    if (this.filters.isActive === false) return 'Inactive Only';
    return 'All Status';
  }

  /**
   * Get claimed filter button text
   */
  getClaimedFilterText(): string {
    if (this.filters.isClaimed === true) return 'Claimed Only';
    if (this.filters.isClaimed === false) return 'Unclaimed Only';
    return 'All Claims';
  }

  /**
   * Get active filter button color
   */
  getActiveFilterColor(): string {
    if (this.filters.isActive !== undefined) return 'primary';
    return 'medium';
  }

  /**
   * Get claimed filter button color
   */
  getClaimedFilterColor(): string {
    if (this.filters.isClaimed !== undefined) return 'primary';
    return 'medium';
  }

  /**
   * Get claimed by username with @ prefix
   */
  getClaimedByUsername(member: OfficialMember): string {
    if (!member.claimedBy) return '';

    const username = (member.claimedBy as any)?.username;
    return username ? `@${username}` : '';
  }
}
