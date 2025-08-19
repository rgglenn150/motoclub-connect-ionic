import { Component, OnInit } from '@angular/core';
import { EventService } from '../service/event.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.page.html',
  styleUrls: ['./events.page.scss'],
})
export class EventsPage implements OnInit {
  events: any[] = [];
  loading: boolean = true;

  constructor(private eventService: EventService) { }

  ngOnInit() {
    this.getEvents();
  }

  getEvents() {
    this.loading = true;
    this.eventService.getEvents().subscribe((res: any) => {
      this.events = res;
      this.loading = false;
    },err=>{
      console.error('Error fetching events:', err);
      this.loading = false;
      // Optionally, handle the error by showing a message to the user
    });
  }
}
