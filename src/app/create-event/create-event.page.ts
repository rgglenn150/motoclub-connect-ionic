import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-create-event',
  templateUrl: './create-event.page.html',
  styleUrls: ['./create-event.page.scss'],
})
export class CreateEventPage implements OnInit {
  event: any = {};
  clubs: any[] = [];

  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.getClubs();
    const clubId = this.route.snapshot.paramMap.get('clubId');
    if (clubId) {
      this.event.club = clubId;
    }
  }

  getClubs() {
    this.http.get('http://localhost:4000/api/club').subscribe((res: any) => {
      this.clubs = res.clubs;
    });
  }

  createEvent() {
    this.http.post('http://localhost:4000/api/event/create', this.event).subscribe((res: any) => {
      this.router.navigate(['/tabs/events']);
    });
  }
}
