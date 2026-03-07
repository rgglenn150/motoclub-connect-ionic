import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ClaimRequest
} from '../../models/official-member.model';
import { OfficialMemberService } from '../../service/official-member.service';
import { ClubService } from '../../service/club.service';
import {
  ToastController,
  LoadingController,
  AlertController
} from '@ionic/angular';
import {
  NetworkService,
  NetworkStatus
} from '../../service/network.service';
import { ErrorService, ErrorInfo } from '../../service/error.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-claim-requests',
  templateUrl: './claim-requests.page.html',
  styleUrls: ['./claim-requests.page.scss'],
})
export class ClaimRequestsPage implements OnInit, OnDestroy {
  // --- STATE MANAGEMENT ---
  clubId: string | null = null;
  clubName: string = '';

  // Claim requests data
  claimRequests: ClaimRequest[] = [];

  // Loading and error states
  loading: boolean = false;
  isRefreshing: boolean = false;
  error: string = '';
  currentError: ErrorInfo | null = null;

  // Processing state
  processingRequests: Set<string> = new Set();

  // Network status
  networkStatus: NetworkStatus = { online: true };

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  // Notes for rejection
  rejectionNotes: { [requestId: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private officialMemberService: OfficialMemberService,
    private clubService: ClubService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private networkService: NetworkService,
    private errorService: ErrorService
  ) {}

  ngOnInit() {
    this.setupNetworkMonitoring();

    // Get club ID from route parameter
    this.clubId = this.route.snapshot.paramMap.get('clubId');

    if (this.clubId) {
      this.loadClubName();
      this.loadClaimRequests();
    } else {
      this.showError('Invalid club ID provided');
    }
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // --- SETUP METHODS ---

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
   * Load pending claim requests
   */
  loadClaimRequests() {
    if (!this.clubId) return;

    this.loading = true;
    this.error = '';
    this.currentError = null;

    this.officialMemberService.getPendingClaimRequests(this.clubId).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (requests) => {
        this.claimRequests = requests;
      },
      error: (error) => {
        console.error('Error loading claim requests:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Load Claim Requests');
        this.currentError = errorInfo;
        this.error = errorInfo.userMessage;
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * Handle pull-to-refresh
   */
  async refreshRequests(event: any) {
    if (!this.clubId) {
      event.target.complete();
      return;
    }

    try {
      this.isRefreshing = true;

      // Reload data
      await Promise.all([
        this.loadClaimRequests(),
        this.loadClubName()
      ]);

      this.presentToast('Claim requests refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing claim requests:', error);
      this.presentToast('Failed to refresh claim requests', 'danger');
    } finally {
      this.isRefreshing = false;
      event.target.complete();
    }
  }

  // --- CLAIM REQUEST ACTIONS ---

  /**
   * Approve a claim request
   */
  async approveRequest(request: ClaimRequest) {
    if (!this.clubId) return;

    if (!this.networkStatus.online) {
      this.presentToast('No internet connection. Please check your connection and try again.', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Approve Claim Request',
      message: `Are you sure you want to approve ${this.getUserDisplayName(request.user)}'s claim to ${this.getMemberDisplayName(request.officialMember)}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Approve',
          handler: () => {
            this.processApproval(request);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Process claim approval
   */
  private processApproval(request: ClaimRequest) {
    if (!this.clubId) return;

    // Prevent concurrent processing of the same request
    if (this.processingRequests.has(request._id)) {
      console.warn(`Request ${request._id} is already being processed`);
      return;
    }

    this.processingRequests.add(request._id);

    this.officialMemberService.approveClaimRequest(this.clubId, request._id).pipe(
      finalize(() => {
        this.processingRequests.delete(request._id);
      })
    ).subscribe({
      next: (response) => {
        this.presentToast(`Claim request approved for ${this.getUserDisplayName(request.user)}`, 'success');

        // Remove request from list
        this.claimRequests = this.claimRequests.filter(r => r._id !== request._id);
      },
      error: (error) => {
        console.error('Error approving claim request:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Approve Claim Request');
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * Reject a claim request
   */
  async rejectRequest(request: ClaimRequest) {
    if (!this.clubId) return;

    if (!this.networkStatus.online) {
      this.presentToast('No internet connection. Please check your connection and try again.', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Reject Claim Request',
      inputs: [
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Optional: Add a note explaining why this claim is being rejected',
          attributes: {
            rows: 3
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reject',
          cssClass: 'danger',
          handler: (data) => {
            this.processRejection(request, data.notes);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Process claim rejection
   */
  private processRejection(request: ClaimRequest, notes?: string) {
    if (!this.clubId) return;

    // Prevent concurrent processing of the same request
    if (this.processingRequests.has(request._id)) {
      console.warn(`Request ${request._id} is already being processed`);
      return;
    }

    this.processingRequests.add(request._id);

    this.officialMemberService.rejectClaimRequest(this.clubId, request._id, notes).pipe(
      finalize(() => {
        this.processingRequests.delete(request._id);
      })
    ).subscribe({
      next: (response) => {
        this.presentToast(`Claim request rejected for ${this.getUserDisplayName(request.user)}`, 'success');

        // Remove request from list
        this.claimRequests = this.claimRequests.filter(r => r._id !== request._id);
      },
      error: (error) => {
        console.error('Error rejecting claim request:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Reject Claim Request');
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * View claim request details
   */
  viewRequestDetails(request: ClaimRequest) {
    // TODO: Show modal with full request details
    this.presentToast('Request details coming soon', 'primary');
  }

  // --- UTILITY METHODS ---

  /**
   * Get user display name
   */
  getUserDisplayName(user: any): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    } else if (user.username) {
      return user.username;
    }
    return 'Unknown User';
  }

  /**
   * Get user avatar URL
   */
  getUserAvatar(user: any): string {
    if (user.profilePicture) {
      return user.profilePicture;
    }

    const name = this.getUserDisplayName(user);
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return `https://placehold.co/80x80/718096/FFFFFF?text=${initials}`;
  }

  /**
   * Get official member display name
   */
  getMemberDisplayName(member: any): string {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    } else if (member.firstName) {
      return member.firstName;
    } else if (member.lastName) {
      return member.lastName;
    }
    return 'Unknown Member';
  }

  /**
   * Get official member number
   */
  getMemberNumber(member: any): string {
    return member.officialNumber || 'N/A';
  }

  /**
   * Check if request is being processed
   */
  isRequestProcessing(requestId: string): boolean {
    return this.processingRequests.has(requestId);
  }

  /**
   * Check if there are no claim requests
   */
  get isEmpty(): boolean {
    return !this.loading && this.claimRequests.length === 0 && !this.error;
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
   * Navigate to official members
   */
  navigateToOfficialMembers() {
    if (this.clubId) {
      this.router.navigate(['/official-members', this.clubId]);
    }
  }
}
