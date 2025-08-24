import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClubService, Club as ServiceClub } from '../../../service/club.service';
import { ToastController, LoadingController } from '@ionic/angular';

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
  errorMessage: string = '';
  
  // This variable controls which tab is currently active.
  selectedTab: 'feed' | 'members' | 'events' = 'feed';
  
  // This simulates the current user's role. In a real app,
  // this would come from an authentication service.
  // Change this to 'member' or 'non-member' to test different views.
  userStatus: 'admin' | 'member' | 'non-member' = 'admin';

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
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    // Get the club ID from the route parameter
    this.clubId = this.route.snapshot.paramMap.get('id');
    
    if (this.clubId) {
      this.fetchClubData(this.clubId);
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
      // Also check if we have successfully loaded club data
      return !this.isLoading && this.club.name && (this.isUserMember || !this.club.isPrivate);
  }
  
  get hasError(): boolean {
    return !!this.errorMessage && !this.isLoading;
  }

  // --- EVENT HANDLERS ---
  // This function is called when the user taps on a different tab segment.
  segmentChanged(event: any) {
    this.selectedTab = event.detail.value;
  }
  
  // Join club functionality
  async joinClub() {
    if (!this.clubId) {
      this.showErrorToast('Invalid club ID');
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Joining club...'
    });
    
    try {
      await loading.present();
      
      this.clubService.joinClub(this.clubId).subscribe({
        next: (response) => {
          console.log('Join club response:', response);
          this.showSuccessToast('Successfully joined the club!');
          // Refresh club data to update member count and user status
          this.fetchClubData(this.clubId!);
          loading.dismiss();
        },
        error: (error) => {
          console.error('Error joining club:', error);
          this.showErrorToast(error.error?.message || 'Failed to join club');
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('Exception in joinClub:', error);
      this.showErrorToast('An unexpected error occurred');
      loading.dismiss();
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
  
  // Placeholder for member actions (promote, remove, etc.)
  presentMemberActions(member: Member) {
      console.log('Presenting actions for member:', member.name);
      // Here you would use Ionic's ActionSheetController to show options
  }
}