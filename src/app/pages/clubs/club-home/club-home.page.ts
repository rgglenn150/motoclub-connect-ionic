import { Component, OnInit } from '@angular/core';

// Define interfaces for your data structures for type safety
interface Club {
  name: string;
  location: string;
  memberCount: number;
  coverPhotoUrl: string;
  logoUrl: string;
  isPrivate: boolean;
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
  // This variable controls which tab is currently active.
  selectedTab: 'feed' | 'members' | 'events' = 'feed';
  
  // This simulates the current user's role. In a real app,
  // this would come from an authentication service.
  // Change this to 'member' or 'non-member' to test different views.
  userStatus: 'admin' | 'member' | 'non-member' = 'admin';

  // --- MOCK DATA ---
  // In a real application, you would fetch this data from your API
  // in the ngOnInit lifecycle hook.
  club: Club = {
    name: 'Asphalt Nomads RC',
    location: 'Oton, Philippines',
    memberCount: 42,
    isPrivate: true,
    coverPhotoUrl: 'https://placehold.co/600x250/2D3748/FFFFFF?text=Club+Cover+Photo',
    logoUrl: 'https://placehold.co/100x100/4A5568/FFFFFF?text=Logo'
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

  constructor() { }

  ngOnInit() {
    // This is where you would typically make your API calls to fetch
    // the club data based on a route parameter (e.g., the club ID).
    // console.log('Fetching data for club...');
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
      return this.isUserMember || !this.club.isPrivate;
  }

  // --- EVENT HANDLERS ---
  // This function is called when the user taps on a different tab segment.
  segmentChanged(event: any) {
    this.selectedTab = event.detail.value;
  }
  
  // Placeholder for join button action
  joinClub() {
      console.log('Join club button clicked');
      // Add logic to send a join request to your backend
  }
  
  // Placeholder for member actions (promote, remove, etc.)
  presentMemberActions(member: Member) {
      console.log('Presenting actions for member:', member.name);
      // Here you would use Ionic's ActionSheetController to show options
  }
}