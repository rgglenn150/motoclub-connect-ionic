import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { EventService } from 'src/app/service/event.service';
import { ClubService } from 'src/app/service/club.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  user = {
    firstName: 'Rider Glenn',
  };

  weather = {
    location: 'Oton, Western Visayas',
    temperature: '28°C',
    condition: 'Partly Cloudy',
    icon: 'partly-sunny-outline'
  };

  nextRide: any = null;
  nextRideLoading = true;

  discoverEvents: any[] = [];
  discoverLoading = true;

  nearbyClubs: any[] = [];
  nearbyClubsLoading = true;
  locationError: string | null = null;

  constructor(private auth: AuthService, private eventService: EventService, private router: Router, private clubService: ClubService) {}

  ngOnInit() {
    const loggedInUser = this.auth.getLoggedInUser();
    if (loggedInUser) {
      this.user = {
        firstName: loggedInUser.firstName || loggedInUser.username || 'RIDER NAME HERE'
      };
    } else {
      console.error('User not found, redirecting to login');
      // Redirect to login or handle accordingly
    }

    this.loadNextRide();
    this.loadDiscoverEvents();
    this.loadNearbyClubs();
  }

  loadDiscoverEvents() {
    this.discoverLoading = true;
    this.eventService.getEvents().subscribe({
      next: (events) => {
        const now = new Date();
        this.discoverEvents = events
          .filter(e => new Date(e.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 10);
        this.discoverLoading = false;
      },
      error: (err) => {
        console.error('Error loading discover events:', err);
        this.discoverEvents = [];
        this.discoverLoading = false;
      }
    });
  }

  loadNextRide() {
    this.nextRideLoading = true;
    this.eventService.getMyClubEvents({ filter: 'upcoming', page: 1, limit: 1 }).subscribe({
      next: (res) => {
        this.nextRide = res.events.length > 0 ? res.events[0] : null;
        this.nextRideLoading = false;
      },
      error: (err) => {
        console.error('Error loading next ride:', err);
        this.nextRide = null;
        this.nextRideLoading = false;
      }
    });
  }

  getClubName(club: any): string {
    if (!club) return '';
    if (typeof club === 'string') return club;
    return club.clubName || '';
  }

  loadNearbyClubs() {
    this.nearbyClubsLoading = true;
    this.locationError = null;
    this.clubService.getNearbyClubs({ radius: 100, limit: 10 }).subscribe({
      next: (response: any) => {
        this.nearbyClubs = response.clubs || [];
        this.nearbyClubsLoading = false;
      },
      error: (err: any) => {
        const code = err?.error?.code || err?.code || '';
        if (code === 'LOCATION_PERMISSION_DENIED') {
          this.locationError = 'Location access denied';
        } else {
          this.locationError = 'Could not load nearby clubs';
        }
        this.nearbyClubsLoading = false;
      }
    });
  }

  getClubInitials(name: string): string {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  viewEventDetails(eventId: string) {
    this.router.navigate(['/event', eventId]);
  }

  viewClubDetails(clubId: string) {
    this.router.navigate(['/clubs', clubId]);
  }

}
