import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-club-details',
  templateUrl: './club-details.page.html',
  styleUrls: ['./club-details.page.scss'],
})
export class ClubDetailsPage implements OnInit {
  club: any;
  events: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.getClubDetails(id);
      this.getClubEvents(id);
    }
  }

  getClubDetails(id: string) {
    this.http.get(`http://localhost:4000/api/club/${id}`).subscribe((res: any) => {
      this.club = res;
    });
  }

  getClubEvents(id: string) {
    this.http.get(`http://localhost:4000/api/event/club/${id}`).subscribe((res: any) => {
      this.events = res;
    });
  }

  goToCreateEvent() {
    console.log('Navigating to create event for club:', this.club);
    // This guard clause makes the function more robust.
    if (!this.club || !this.club._id) {
      console.error('Cannot create event: Club data is not available.');
      // You could also show a toast message to the user here.
      return;
    }
    this.router.navigate(['/create-event', { clubId: this.club._id }]);
  }
}
