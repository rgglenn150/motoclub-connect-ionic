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
    coverPhotoUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=250&fit=crop&crop=center',
    logoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop&crop=center'
  };
  
  pinnedPost: PinnedPost = {
      title: 'Clubhouse Maintenance Day',
      content: 'Heads up, everyone! We\'re having a mandatory maintenance day this Saturday. Please come down to help clean and prep for the new season. Pizza and drinks on us!'
  };

  upcomingRide: ClubEvent = {
      type: 'RIDE',
      date: '2025-08-24T09:00:00Z',
      title: 'Coastal Sunrise Cruise',
      imageUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=200&h=200&fit=crop&crop=center',
      location: 'Shell Gas Station, Oton',
      attendeeCount: 18
  };
  
  members: Member[] = [
    { name: 'John Doe', role: 'Admin', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=center' },
    { name: 'Jane Smith', role: 'Member', avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b515?w=80&h=80&fit=crop&crop=center' },
    { name: 'Mike Williams', role: 'Member', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=center' }
  ];

  events: ClubEvent[] = [
    this.upcomingRide, // Include the upcoming ride in the events list
    {
      type: 'MEETING',
      date: '2025-09-01T19:00:00Z',
      title: 'Monthly Club Meeting',
      imageUrl: 'https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?w=200&h=200&fit=crop&crop=center',
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

  // --- IMAGE ERROR HANDLING AND FALLBACKS ---
  
  private fallbackAttempts = new Map<string, number>();

  getDefaultCoverPhoto(): string {
    return 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=250&fit=crop&crop=center';
  }

  getDefaultLogoPhoto(): string {
    return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop&crop=center';
  }

  getDefaultEventPhoto(): string {
    return 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=200&h=200&fit=crop&crop=center';
  }

  getDefaultAvatarPhoto(): string {
    return 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=80&h=80&fit=crop&crop=center';
  }

  // Fallback chains for different image types
  private getCoverPhotoFallbacks(): string[] {
    return [
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=250&fit=crop&crop=center',
      'https://picsum.photos/600/250?random=1',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDYwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjMkQzNzQ4Ii8+Cjx0ZXh0IHg9IjMwMCIgeT0iMTI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iI0Y3RkFGQyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij5DbHViIENvdmVyPC90ZXh0Pgo8L3N2Zz4K'
    ];
  }

  private getLogoFallbacks(): string[] {
    return [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop&crop=center',
      'https://picsum.photos/100/100?random=2',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNEE1NTY4IiByeD0iNTAiLz4KPHRleHQgeD0iNTAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iI0Y3RkFGQyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5MT0dPPC90ZXh0Pgo8L3N2Zz4K'
    ];
  }

  private getEventImageFallbacks(): string[] {
    return [
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=200&h=200&fit=crop&crop=center',
      'https://picsum.photos/200/200?random=3',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNEE1NTY4IiByeD0iOCIvPgo8dGV4dCB4PSIxMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiIGZpbGw9IiNGN0ZBRkMiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+RVZFTlQ8L3RleHQ+Cjwvc3ZnPgo='
    ];
  }

  private getAvatarFallbacks(): string[] {
    return [
      'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=80&h=80&fit=crop&crop=center',
      'https://picsum.photos/80/80?random=4',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjNzE4MDk2IiByeD0iNDAiLz4KPHR4ZXh0IHg9IjQwIiB5PSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiIGZpbGw9IiNGN0ZBRkMiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiI+VVNFUjwvdGV4dD4KPC9zdmc+Cg=='
    ];
  }

  private handleImageError(event: any, fallbacks: string[], imageType: string): void {
    const img = event.target;
    const currentSrc = img.src;
    const attemptKey = `${imageType}-${currentSrc}`;
    
    let attempts = this.fallbackAttempts.get(attemptKey) || 0;
    
    if (attempts < fallbacks.length - 1) {
      attempts++;
      this.fallbackAttempts.set(attemptKey, attempts);
      img.src = fallbacks[attempts];
      console.warn(`${imageType} failed to load, trying fallback ${attempts}:`, fallbacks[attempts]);
    } else {
      console.error(`All ${imageType} fallbacks failed for:`, currentSrc);
      // Use the final SVG fallback
      img.src = fallbacks[fallbacks.length - 1];
    }
  }

  onCoverPhotoError(event: any): void {
    this.handleImageError(event, this.getCoverPhotoFallbacks(), 'Cover photo');
  }

  onLogoError(event: any): void {
    this.handleImageError(event, this.getLogoFallbacks(), 'Logo');
  }

  onEventImageError(event: any): void {
    this.handleImageError(event, this.getEventImageFallbacks(), 'Event image');
  }

  onAvatarError(event: any): void {
    this.handleImageError(event, this.getAvatarFallbacks(), 'Avatar');
  }
}