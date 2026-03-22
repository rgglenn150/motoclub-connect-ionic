import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { EventService, Event as AppEvent } from 'src/app/service/event.service';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.page.html',
  styleUrls: ['./event-detail.page.scss'],
})
export class EventDetailPage implements OnInit {
  event: AppEvent | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private eventService: EventService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.eventService.getEventById(id).subscribe({
        next: (event) => {
          this.event = event;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Could not load event details.';
          this.isLoading = false;
        }
      });
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  getClubName(club: any): string {
    if (!club) return '';
    if (typeof club === 'string') return club;
    return club.clubName || '';
  }

  getCreatorName(createdBy: any): string {
    if (!createdBy) return '';
    if (typeof createdBy === 'string') return createdBy;
    return createdBy.name || createdBy.username || '';
  }

  getEventStatus(): 'upcoming' | 'today' | 'past' {
    if (!this.event) return 'past';
    const now = new Date();
    const start = new Date(this.event.startTime);
    const startDate = start.toDateString();
    const todayDate = now.toDateString();
    if (start < now && startDate !== todayDate) return 'past';
    if (startDate === todayDate) return 'today';
    return 'upcoming';
  }

  getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ride: 'RIDE',
      meeting: 'MEETING',
      meetup: 'MEETUP',
      event: 'EVENT'
    };
    return labels[type] || type.toUpperCase();
  }

  getEventTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      ride: 'bicycle-outline',
      meeting: 'people-outline',
      meetup: 'beer-outline',
      event: 'star-outline'
    };
    return icons[type] || 'calendar-outline';
  }
}
