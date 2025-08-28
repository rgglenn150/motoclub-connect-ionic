import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClubService, Club as ServiceClub, JoinRequest, ClubMember } from '../../../service/club.service';
import { ToastController, LoadingController, AlertController, ActionSheetController } from '@ionic/angular';

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

interface ClubEvent {
  type: 'RIDE' | 'MEETING' | 'EVENT';
  date: string;
  title: string;
  imageUrl: string;
  location: string;
  attendeeCount: number;
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
export class ClubHomePage implements OnInit {

  // --- STATE MANAGEMENT ---
  // Club ID from route parameter
  clubId: string | null = null;
  
  // Loading and error states
  isLoading: boolean = false;
  statusLoading: boolean = false;
  joiningClub: boolean = false;
  errorMessage: string = '';
  
  // This variable controls which tab is currently active.
  selectedTab: 'feed' | 'members' | 'events' | 'manage' = 'feed';
  
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

  // Club data - will be populated from API
  club: Club = {
    name: '',
    location: '',
    memberCount: 0,
    isPrivate: false,
    coverPhotoUrl: 'https://placehold.co/600x250/2D3748/FFFFFF?text=Loading...',
    logoUrl: 'https://placehold.co/100x100/4A5568/FFFFFF?text=..'
  };
  
  pinnedPost: PinnedPost = {
      title: 'Clubhouse Maintenance Day',
      content: 'Heads up, everyone! We\'re having a mandatory maintenance day this Saturday. Please come down to help clean and prep for the new season. Pizza and drinks on us!'
  };

  upcomingRide: ClubEvent = {
      type: 'RIDE',
      date: '2025-08-24T09:00:00Z',
      title: 'Coastal Sunrise Cruise',
      imageUrl: 'https://placehold.co/200x200/F59E0B/000000?text=RIDE',
      location: 'Shell Gas Station, Oton',
      attendeeCount: 18
  };
  
  members: Member[] = [
    { name: 'John Doe', role: 'Admin', avatarUrl: 'https://placehold.co/80x80/718096/FFFFFF?text=JD' },
    { name: 'Jane Smith', role: 'Member', avatarUrl: 'https://placehold.co/80x80/718096/FFFFFF?text=JS' },
    { name: 'Mike Williams', role: 'Member', avatarUrl: 'https://placehold.co/80x80/718096/FFFFFF?text=MW' }
  ];

  events: ClubEvent[] = [
    this.upcomingRide, // Include the upcoming ride in the events list
    {
      type: 'MEETING',
      date: '2025-09-01T19:00:00Z',
      title: 'Monthly Club Meeting',
      imageUrl: 'https://placehold.co/200x200/4A5568/FFFFFF?text=MEET',
      location: 'Clubhouse Garage',
      attendeeCount: 25
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private clubService: ClubService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController
  ) { }

  ngOnInit() {
    // Get the club ID from the route parameter
    this.clubId = this.route.snapshot.paramMap.get('id');
    
    if (this.clubId) {
      this.fetchClubData(this.clubId);
      // Check user's membership status after getting club ID
      this.checkMembershipStatus();
    } else {
      this.errorMessage = 'No club ID provided';
      this.showErrorToast('Invalid club ID');
    }
  }

  // --- API METHODS ---
  async fetchClubData(clubId: string) {
    const loading = await this.loadingController.create({
      message: 'Loading club details...',
      duration: 10000 // Max 10 seconds
    });
    
    try {
      this.isLoading = true;
      this.errorMessage = '';
      await loading.present();
      
      this.clubService.getClubDetails(clubId).subscribe({
        next: (response) => {
          console.log('Club data received:', response);
          this.updateClubData(response);
          loading.dismiss();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching club data:', error);
          this.errorMessage = 'Failed to load club details';
          this.showErrorToast('Failed to load club details');
          loading.dismiss();
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Exception in fetchClubData:', error);
      this.errorMessage = 'An unexpected error occurred';
      this.showErrorToast('An unexpected error occurred');
      loading.dismiss();
      this.isLoading = false;
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
      logoUrl: clubData.logoUrl || 'https://placehold.co/100x100/4A5568/FFFFFF?text=Logo',
      coverPhotoUrl: clubData.coverPhotoUrl || 'https://placehold.co/600x250/2D3748/FFFFFF?text=Club+Cover+Photo',
      description: clubData.description,
      members: clubData.members,
      createdBy: clubData.createdBy,
      createdAt: clubData.createdAt
    };
  }

  // Check user's membership status for this club
  async checkMembershipStatus() {
    if (!this.clubId) {
      console.error('No club ID available for status check');
      return;
    }

    try {
      this.statusLoading = true;
      
      this.clubService.getMembershipStatus(this.clubId).subscribe({
        next: (response) => {
          console.log('Membership status received:', response);
          this.updateMembershipStatus(response);
          this.statusLoading = false;
        },
        error: (error) => {
          console.error('Error fetching membership status:', error);
          // Handle different error scenarios
          if (error.status === 401) {
            // Unauthorized - redirect to login or default to not-member
            this.userStatus = 'not-member';
          } else if (error.status === 404) {
            // Club not found
            this.showErrorToast('Club not found');
            this.userStatus = 'not-member';
          } else {
            // Other errors - default to not-member and show generic error
            console.warn('Defaulting to not-member status due to error');
            this.userStatus = 'not-member';
          }
          this.statusLoading = false;
        }
      });
    } catch (error) {
      console.error('Exception in checkMembershipStatus:', error);
      this.userStatus = 'not-member';
      this.statusLoading = false;
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
      memberId: response.memberId
    };
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top'
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
      return !this.isLoading && !this.statusLoading && this.club.name && (this.isUserMember || !this.club.isPrivate);
  }
  
  get hasError(): boolean {
    return !!this.errorMessage && !this.isLoading;
  }

  // --- EVENT HANDLERS ---
  // This function is called when the user taps on a different tab segment.
  segmentChanged(event: any) {
    this.selectedTab = event.detail.value;
    
    // Load admin data when manage tab is selected
    if (this.selectedTab === 'manage' && this.isUserAdmin) {
      this.loadAdminData();
    }
  }
  
  // Join club functionality with enhanced flow for public vs private clubs
  async joinClub() {
    if (!this.clubId) {
      this.showErrorToast('Invalid club ID');
      return;
    }
    
    // Determine loading message based on club privacy
    const loadingMessage = this.club?.isPrivate ? 'Sending join request...' : 'Joining club...';
    const loading = await this.loadingController.create({
      message: loadingMessage
    });
    
    try {
      this.joiningClub = true;
      await loading.present();
      
      this.clubService.joinClub(this.clubId).subscribe({
        next: (response) => {
          console.log('Join club response:', response);
          
          // Enhanced success message based on response type
          if (response.instant) {
            // Public club - instant join
            this.presentToast('Successfully joined club!', 'success');
          } else {
            // Private club - join request sent
            this.presentToast('Join request sent! Waiting for admin approval.', 'primary');
          }
          
          // Refresh club data to update member count and user status
          this.fetchClubData(this.clubId!);
          // Also refresh membership status
          this.checkMembershipStatus();
          loading.dismiss();
          this.joiningClub = false;
        },
        error: (error) => {
          console.error('Error joining club:', error);
          let errorMessage = 'Failed to join club';
          
          // Handle specific error scenarios
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 401) {
            errorMessage = 'Please log in to join clubs';
          } else if (error.status === 404) {
            errorMessage = 'Club not found';
          } else if (error.status === 409) {
            errorMessage = 'You are already a member or have a pending request';
          }
          
          this.showErrorToast(errorMessage);
          loading.dismiss();
          this.joiningClub = false;
        }
      });
    } catch (error) {
      console.error('Exception in joinClub:', error);
      this.showErrorToast('An unexpected error occurred');
      loading.dismiss();
      this.joiningClub = false;
    }
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    toast.present();
  }

  // Enhanced toast method for different message types
  private async presentToast(message: string, color: 'success' | 'primary' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
  

  // --- SMART JOIN BUTTON LOGIC ---
  // Dynamic button text based on user status and club privacy
  getJoinButtonText(): string {
    if (this.statusLoading || this.joiningClub) {
      return this.joiningClub ? 'Processing...' : 'Checking...';
    }
    
    switch(this.userStatus) {
      case 'admin': return 'Manage';
      case 'member': return 'Member';
      case 'pending': return 'Request Pending';
      case 'not-member':
        return this.club?.isPrivate ? 'Request to Join' : 'Join';
      default: return 'Join';
    }
  }

  // Button disabled state logic
  isJoinButtonDisabled(): boolean {
    return this.statusLoading || 
           this.joiningClub ||
           this.userStatus === 'member' || 
           this.userStatus === 'pending';
  }

  // Button color logic based on status
  getJoinButtonColor(): string {
    if (this.statusLoading || this.joiningClub) {
      return 'medium';
    }
    
    switch(this.userStatus) {
      case 'admin': return 'success';
      case 'member': return 'medium';
      case 'pending': return 'medium';
      case 'not-member': return 'brand-amber';
      default: return 'brand-amber';
    }
  }

  // Button icon logic
  getJoinButtonIcon(): string {
    if (this.statusLoading || this.joiningClub) {
      return '';
    }
    
    switch(this.userStatus) {
      case 'admin': return 'settings-outline';
      case 'member': return 'checkmark-circle-outline';
      case 'pending': return 'time-outline';
      case 'not-member': return 'person-add-outline';
      default: return 'person-add-outline';
    }
  }

  // Check if button should show spinner
  shouldShowSpinner(): boolean {
    return this.statusLoading || this.joiningClub;
  }

  // Check if button is actionable (not just status display)
  isJoinButtonActionable(): boolean {
    return this.userStatus === 'not-member' && !this.statusLoading && !this.joiningClub;
  }

  // --- ADMIN MANAGEMENT METHODS ---

  /**
   * Load all admin data (join requests and members)
   */
  async loadAdminData() {
    if (!this.isUserAdmin || !this.clubId) return;
    
    // Load both join requests and members in parallel
    await Promise.all([
      this.loadJoinRequests(),
      this.loadClubMembers()
    ]);
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
          this.joinRequests = requests.filter(req => req.status === 'pending');
          this.joinRequestsLoading = false;
        },
        error: (error) => {
          console.error('Error loading join requests:', error);
          this.handleAdminError('Failed to load join requests', error);
          this.joinRequestsLoading = false;
        }
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
        }
      });
    } catch (error) {
      console.error('Exception in loadClubMembers:', error);
      this.membersLoading = false;
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
          role: 'cancel'
        },
        {
          text: 'Approve',
          handler: () => {
            this.processJoinRequest(request, 'approve');
          }
        }
      ]
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
          role: 'cancel'
        },
        {
          text: 'Reject',
          cssClass: 'danger',
          handler: () => {
            this.processJoinRequest(request, 'reject');
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Process a join request (approve or reject)
   */
  private async processJoinRequest(request: JoinRequest, action: 'approve' | 'reject') {
    if (!this.clubId) return;

    try {
      this.processingRequests.add(request._id);
      
      const serviceCall = action === 'approve' 
        ? this.clubService.approveJoinRequest(this.clubId, request._id)
        : this.clubService.rejectJoinRequest(this.clubId, request._id);

      serviceCall.subscribe({
        next: (response) => {
          const actionText = action === 'approve' ? 'approved' : 'rejected';
          this.presentToast(`Successfully ${actionText} ${request.user.name}'s request`, 'success');
          
          // Remove the request from the list
          this.joinRequests = this.joinRequests.filter(req => req._id !== request._id);
          
          // If approved, refresh member count and members list
          if (action === 'approve') {
            this.fetchClubData(this.clubId!); // Refresh club data for member count
            this.loadClubMembers(); // Refresh members list
          }
          
          this.processingRequests.delete(request._id);
        },
        error: (error) => {
          console.error(`Error ${action}ing join request:`, error);
          this.handleAdminError(`Failed to ${action} request`, error);
          this.processingRequests.delete(request._id);
        }
      });
    } catch (error) {
      console.error(`Exception in ${action} request:`, error);
      this.processingRequests.delete(request._id);
    }
  }

  /**
   * Show member actions menu
   */
  async presentMemberActions(member: ClubMember) {
    // Don't allow actions on self or if processing
    const currentUserId = this.membershipData.memberId;
    if (member._id === currentUserId || this.processingMembers.has(member._id)) {
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
        }
      });
    } else if (member.role === 'admin') {
      buttons.push({
        text: 'Demote to Member',
        icon: 'arrow-down-outline',
        handler: () => {
          this.demoteToMember(member);
        }
      });
    }

    // Remove member button
    buttons.push({
      text: 'Remove from Club',
      icon: 'person-remove-outline',
      role: 'destructive',
      handler: () => {
        this.removeMemberFromClub(member);
      }
    });

    // Cancel button
    buttons.push({
      text: 'Cancel',
      icon: 'close-outline',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetController.create({
      header: `Manage ${member.user.name}`,
      buttons: buttons
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
          role: 'cancel'
        },
        {
          text: 'Promote',
          handler: () => {
            this.processMemberRoleChange(member, 'promote');
          }
        }
      ]
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
          role: 'cancel'
        },
        {
          text: 'Demote',
          cssClass: 'warning',
          handler: () => {
            this.processMemberRoleChange(member, 'demote');
          }
        }
      ]
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
          role: 'cancel'
        },
        {
          text: 'Remove',
          cssClass: 'danger',
          handler: () => {
            this.processMemberRemoval(member);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Process member role change (promote/demote)
   */
  private async processMemberRoleChange(member: ClubMember, action: 'promote' | 'demote') {
    if (!this.clubId) return;

    try {
      this.processingMembers.add(member._id);
      
      const serviceCall = action === 'promote' 
        ? this.clubService.promoteToAdmin(this.clubId, member._id)
        : this.clubService.demoteToMember(this.clubId, member._id);

      serviceCall.subscribe({
        next: (response) => {
          const actionText = action === 'promote' ? 'promoted' : 'demoted';
          const newRole = action === 'promote' ? 'admin' : 'member';
          
          this.presentToast(`Successfully ${actionText} ${member.user.name}`, 'success');
          
          // Update the member role locally
          const memberIndex = this.clubMembers.findIndex(m => m._id === member._id);
          if (memberIndex !== -1) {
            this.clubMembers[memberIndex].role = newRole;
          }
          
          this.processingMembers.delete(member._id);
        },
        error: (error) => {
          console.error(`Error ${action}ing member:`, error);
          this.handleAdminError(`Failed to ${action} member`, error);
          this.processingMembers.delete(member._id);
        }
      });
    } catch (error) {
      console.error(`Exception in ${action} member:`, error);
      this.processingMembers.delete(member._id);
    }
  }

  /**
   * Process member removal
   */
  private async processMemberRemoval(member: ClubMember) {
    if (!this.clubId) return;

    try {
      this.processingMembers.add(member._id);
      
      this.clubService.removeMember(this.clubId, member._id).subscribe({
        next: (response) => {
          this.presentToast(`Successfully removed ${member.user.name}`, 'success');
          
          // Remove member from local list
          this.clubMembers = this.clubMembers.filter(m => m._id !== member._id);
          
          // Refresh club data for updated member count
          this.fetchClubData(this.clubId!);
          
          this.processingMembers.delete(member._id);
        },
        error: (error) => {
          console.error('Error removing member:', error);
          this.handleAdminError('Failed to remove member', error);
          this.processingMembers.delete(member._id);
        }
      });
    } catch (error) {
      console.error('Exception in remove member:', error);
      this.processingMembers.delete(member._id);
    }
  }

  /**
   * Handle admin operation errors
   */
  private handleAdminError(message: string, error: any) {
    let errorMessage = message;
    
    if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action';
    } else if (error.status === 404) {
      errorMessage = 'Resource not found';
    } else if (error.status === 409) {
      errorMessage = error.error?.message || 'Operation conflict';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    this.presentToast(errorMessage, 'danger');
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
   * Get avatar URL with fallback
   */
  getAvatarUrl(profilePicture?: string, name?: string): string {
    if (profilePicture) {
      return profilePicture;
    }
    // Create initials-based placeholder
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
    return `https://placehold.co/80x80/718096/FFFFFF?text=${initials}`;
  }
}