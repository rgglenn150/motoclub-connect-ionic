import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-events',
  templateUrl: './events.page.html',
  styleUrls: ['./events.page.scss'],
})
export class EventsPage implements OnInit {
  events: any[] = [];

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.getEvents();
  }

  getEvents() {
    this.http.get('http://localhost:4000/api/event').subscribe((res: any) => {
      this.events = res;
    });
  }
}
