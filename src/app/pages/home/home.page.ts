import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/service/auth.service';

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

  nextRide = {
    title: 'Coastal Highway Run',
    time: 'Tomorrow at 9:00 AM',
    description: 'The Iron Eagles are meeting at Shell Station for the weekly coastal run. All members are expected to attend.',
    icon: 'calendar-outline'
  };

  events = [
    {
      title: 'Charity Ride for Kids',
      host: 'Public Group',
      location: 'Iloilo City',
      time: 'Aug 12, 8:00 AM'
    },
    {
      title: 'Tigbauan Bike Night',
      host: 'Tigbauan Riders',
      location: 'Tigbauan Plaza',
      time: 'Aug 15, 7:00 PM'
    },
    {
      title: 'Mountain Trail Adventure',
      host: 'Solo Rider',
      location: 'Bucari, Leon',
      time: 'Aug 18, 6:00 AM'
    }
  ];

  clubs = [
    {
      name: 'Iloilo Riders',
      members: 125,
      logo: 'https://placehold.co/80x80/4A5568/FFFFFF?text=IR'
    },
    {
      name: 'Tigbauan Riders',
      members: 42,
      logo: 'https://placehold.co/80x80/4A5568/FFFFFF?text=TR'
    },
    {
      name: 'Guimbal Riders',
      members: 78,
      logo: 'https://placehold.co/80x80/4A5568/FFFFFF?text=GR'
    }
  ];

  constructor(private auth:AuthService) {

   }

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
  }

}
