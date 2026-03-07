import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import {
  OfficialMember,
  ClaimRequest
} from '../../../models/official-member.model';
import { OfficialMemberService } from '../../../service/official-member.service';
import { ClubService } from '../../../service/club.service';
import {
  ToastController,
  LoadingController,
  AlertController
} from '@ionic/angular';
import {
  NetworkService,
  NetworkStatus
} from '../../../service/network.service';
import { ErrorService, ErrorInfo } from '../../../service/error.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-official-member-detail',
  templateUrl: './official-member-detail.page.html',
  styleUrls: ['./official-member-detail.page.scss'],
})
export class OfficialMemberDetailPage implements OnInit, OnDestroy {
  // --- STATE MANAGEMENT ---
  clubId: string | null = null;
  memberId: string | null = null;

  // Member data
  member: OfficialMember | null = null;
  clubName: string = '';

  // Loading and error states
  loading: boolean = false;
  isClaiming: boolean = false;
  isGeneratingCard: boolean = false;
  isEditing: boolean = false;
  error: string = '';
  currentError: ErrorInfo | null = null;

  // User permissions
  isAdmin: boolean = false;
  isMember: boolean = false;
  canClaim: boolean = false;

  // ID Card data
  idCardUrl: string | null = null;
  idCardLoading: boolean = false;

  // Edit form data
  editFormData: Partial<OfficialMember> = {};

  // Network status
  networkStatus: NetworkStatus = { online: true };

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private officialMemberService: OfficialMemberService,
    private clubService: ClubService,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private networkService: NetworkService,
    private errorService: ErrorService
  ) {}

  ngOnInit() {
    this.setupNetworkMonitoring();

    // Get club ID and member ID from route parameters
    this.clubId = this.route.snapshot.paramMap.get('clubId');
    this.memberId = this.route.snapshot.paramMap.get('memberId');

    if (this.clubId && this.memberId) {
      this.checkUserPermissions();
      this.loadMemberDetail();
    } else {
      this.showError('Invalid club or member ID provided');
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
   * Load member details
   */
  loadMemberDetail() {
    if (!this.clubId || !this.memberId) return;

    this.loading = true;
    this.error = '';
    this.currentError = null;

    this.officialMemberService.getOfficialMemberById(this.clubId, this.memberId).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (member) => {
        this.member = member;
        this.canClaim = !member.claimedBy && this.isMember;
      },
      error: (error) => {
        console.error('Error loading member detail:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Load Member Detail');
        this.currentError = errorInfo;
        this.error = errorInfo.userMessage;
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * Check user permissions for this club
   */
  private checkUserPermissions() {
    if (!this.clubId) return;

    this.clubService.getMembershipStatus(this.clubId).subscribe({
      next: (response) => {
        this.isAdmin = response.status === 'admin';
        this.isMember = response.status === 'member' || this.isAdmin;
      },
      error: (error) => {
        console.error('Error checking permissions:', error);
        this.isAdmin = false;
        this.isMember = false;
      }
    });
  }

  /**
   * Load club name
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

  // --- CLAIM METHODS ---

  /**
   * Claim this official member profile
   */
  async claimMember() {
    if (!this.clubId || !this.memberId || !this.isMember || !this.member) return;

    if (!this.networkStatus.online) {
      this.presentToast('No internet connection. Please check your connection and try again.', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Claim Official Member Profile',
      message: `Are you sure you want to claim the profile for ${this.member.firstName} ${this.member.lastName}? This will link your account to this official member record.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Claim',
          handler: () => {
            this.processClaim();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Process the claim request
   */
  private processClaim() {
    if (!this.clubId || !this.memberId) return;

    this.isClaiming = true;

    this.officialMemberService.createClaimRequest(this.clubId, this.memberId).pipe(
      finalize(() => {
        this.isClaiming = false;
      })
    ).subscribe({
      next: (request) => {
        this.presentToast('Claim request submitted! Waiting for admin approval.', 'success');
        this.canClaim = false;
        this.closeModal();
      },
      error: (error) => {
        console.error('Error creating claim request:', error);
        const errorInfo = this.errorService.analyzeError(error, 'Claim Member');
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  // --- ID CARD METHODS ---

  /**
   * Generate and preview ID card
   */
  async generateIDCard() {
    if (!this.clubId || !this.memberId) return;

    if (!this.networkStatus.online) {
      this.presentToast('No internet connection. Please check your connection and try again.', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Generating ID card...',
      duration: this.networkService.getRecommendedTimeout(),
    });

    try {
      this.idCardLoading = true;
      await loading.present();

      this.officialMemberService.generateIDCard(this.clubId, this.memberId).pipe(
        finalize(() => {
          this.idCardLoading = false;
          loading.dismiss();
        })
      ).subscribe({
        next: (blob) => {
          // Create object URL for preview
          this.idCardUrl = window.URL.createObjectURL(blob);
          this.presentIDCardPreview();
        },
        error: (error) => {
          console.error('Error generating ID card:', error);
          const errorInfo = this.errorService.analyzeError(error, 'Generate ID Card');
          this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
        }
      });
    } catch (error) {
      console.error('Exception in generateIDCard:', error);
      this.idCardLoading = false;
      loading.dismiss();
    }
  }

  /**
   * Present ID card preview modal
   */
  async presentIDCardPreview() {
    if (!this.idCardUrl) return;

    const alert = await this.alertController.create({
      header: 'Official Member ID Card',
      message: `<img src="${this.idCardUrl}" style="width: 100%; max-width: 400px; border-radius: 8px;" />`,
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        },
        {
          text: 'Download',
          handler: () => {
            this.downloadIDCard();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Download ID card
   */
  downloadIDCard() {
    if (!this.idCardUrl) return;

    const a = document.createElement('a');
    a.href = this.idCardUrl;
    a.download = `id-card-${this.member?.officialNumber || 'member'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.presentToast('ID card downloaded successfully', 'success');
  }

  // --- EDIT METHODS ---

  /**
   * Enter edit mode
   */
  enterEditMode() {
    if (!this.member) return;

    this.isEditing = true;
    this.editFormData = {
      firstName: this.member.firstName,
      lastName: this.member.lastName,
      address: this.member.address,
      plateNumber: this.member.plateNumber,
      description: this.member.description,
      isActive: this.member.isActive
    };
  }

  /**
   * Cancel edit mode
   */
  cancelEdit() {
    this.isEditing = false;
    this.editFormData = {};
  }

  /**
   * Save member changes
   */
  async saveChanges() {
    if (!this.clubId || !this.memberId) return;

    if (!this.networkStatus.online) {
      this.presentToast('No internet connection. Please check your connection and try again.', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving changes...',
      duration: this.networkService.getRecommendedTimeout(),
    });

    try {
      await loading.present();

      this.officialMemberService.updateOfficialMember(this.clubId, this.memberId, this.editFormData).pipe(
        finalize(() => {
          loading.dismiss();
        })
      ).subscribe({
        next: (updatedMember) => {
          this.member = updatedMember;
          this.isEditing = false;
          this.editFormData = {};
          this.presentToast('Member updated successfully', 'success');
        },
        error: (error) => {
          console.error('Error updating member:', error);
          const errorInfo = this.errorService.analyzeError(error, 'Update Member');
          this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
        }
      });
    } catch (error) {
      console.error('Exception in saveChanges:', error);
      loading.dismiss();
    }
  }

  // --- MODAL METHODS ---

  /**
   * Close the modal
   */
  closeModal() {
    this.modalController.dismiss();
  }

  // --- UTILITY METHODS ---

  /**
   * Get member photo URL with fallback
   */
  getMemberPhoto(): string {
    if (this.member?.photoUrl) {
      return this.member.photoUrl;
    }

    const initials = this.getMemberInitials();
    return `https://placehold.co/150x150/718096/FFFFFF?text=${initials}`;
  }

  /**
   * Get member initials for avatar placeholder
   */
  getMemberInitials(): string {
    if (!this.member) return '??';

    const first = this.member.firstName?.charAt(0) || '';
    const last = this.member.lastName?.charAt(0) || '';
    return (first + last).toUpperCase().slice(0, 2);
  }

  /**
   * Get claim status display
   */
  getClaimStatus(): { text: string; color: string } {
    if (this.member?.claimedBy) {
      return { text: 'Claimed', color: 'success' };
    }
    return { text: 'Unclaimed', color: 'medium' };
  }

  /**
   * Get active status display
   */
  getActiveStatus(): { text: string; color: string } {
    if (this.member?.isActive) {
      return { text: 'Active', color: 'success' };
    }
    return { text: 'Inactive', color: 'danger' };
  }

  /**
   * Get claimed by username
   */
  getClaimedByUsername(): string {
    if (!this.member?.claimedBy) return '';

    const user = this.member.claimedBy as any;
    return user?.username ? `@${user.username}` : '';
  }

  /**
   * Get claimed by display name
   */
  getClaimedByDisplayName(): string {
    if (!this.member?.claimedBy) return '';

    const user = this.member.claimedBy as any;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || 'Unknown User';
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
   * Navigate back to official members list
   */
  navigateBack() {
    if (this.clubId) {
      this.router.navigate(['/official-members', this.clubId]);
    } else {
      this.modalController.dismiss();
    }
  }
}
