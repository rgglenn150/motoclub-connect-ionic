import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController, AlertController, ToastController } from '@ionic/angular';
import { EventService, Event as AppEvent, EventAttendee } from 'src/app/service/event.service';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.page.html',
  styleUrls: ['./event-detail.page.scss'],
})
export class EventDetailPage implements OnInit {
  event: AppEvent | null = null;
  isLoading = true;
  error: string | null = null;
  isMutating = false;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private router: Router,
    private eventService: EventService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.eventService.getEventById(id).subscribe({
        next: (event) => {
          this.event = event;
          this.isLoading = false;
        },
        error: (_err) => {
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

  get isPast(): boolean {
    return this.getEventStatus() === 'past';
  }

  get isGlobal(): boolean {
    return this.event?.scope === 'global';
  }

  get attendeeCount(): number {
    return this.event?.attendeeCount ?? 0;
  }

  get isFull(): boolean {
    if (!this.event?.maxAttendees) return false;
    return this.attendeeCount >= this.event.maxAttendees;
  }

  get spotsLeft(): number | null {
    if (!this.event?.maxAttendees) return null;
    return Math.max(0, this.event.maxAttendees - this.attendeeCount);
  }

  get visibleAttendees(): EventAttendee[] {
    return (this.event?.attendees || []).slice(0, 8);
  }

  get extraAttendees(): number {
    const total = this.attendeeCount;
    const shown = this.visibleAttendees.length;
    return Math.max(0, total - shown);
  }

  attendeeInitials(a: EventAttendee): string {
    const src = a.name || a.username || '';
    const parts = src.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0] || '').join('').toUpperCase() || '?';
  }

  async joinEvent() {
    if (!this.event?._id || this.isMutating) return;
    if (this.isFull) return;

    this.isMutating = true;
    // Optimistic update
    const prev = { isJoined: this.event.isJoined, attendeeCount: this.event.attendeeCount };
    this.event.isJoined = true;
    this.event.attendeeCount = (this.event.attendeeCount ?? 0) + 1;

    this.eventService.joinEvent(this.event._id).subscribe({
      next: (updated) => {
        if (this.event) {
          if (updated.attendeeCount !== undefined) this.event.attendeeCount = updated.attendeeCount;
          if (updated.isJoined !== undefined) this.event.isJoined = updated.isJoined;
        }
        this.isMutating = false;
      },
      error: (err) => {
        console.error('Failed to join event:', err);
        if (this.event) {
          this.event.isJoined = prev.isJoined;
          this.event.attendeeCount = prev.attendeeCount;
        }
        this.isMutating = false;
        this.showToast('Could not join event', 'danger');
      }
    });
  }

  async leaveEvent() {
    if (!this.event?._id || this.isMutating) return;

    this.isMutating = true;
    const prev = { isJoined: this.event.isJoined, attendeeCount: this.event.attendeeCount };
    this.event.isJoined = false;
    this.event.attendeeCount = Math.max(0, (this.event.attendeeCount ?? 0) - 1);

    this.eventService.leaveEvent(this.event._id).subscribe({
      next: (updated) => {
        if (this.event) {
          if (updated.attendeeCount !== undefined) this.event.attendeeCount = updated.attendeeCount;
          if (updated.isJoined !== undefined) this.event.isJoined = updated.isJoined;
        }
        this.isMutating = false;
      },
      error: (err) => {
        console.error('Failed to leave event:', err);
        if (this.event) {
          this.event.isJoined = prev.isJoined;
          this.event.attendeeCount = prev.attendeeCount;
        }
        this.isMutating = false;
        this.showToast('Could not leave event', 'danger');
      }
    });
  }

  async confirmDelete() {
    if (!this.event?._id) return;
    const alert = await this.alertCtrl.create({
      header: 'Delete Event?',
      message: 'Delete this event? This cannot be undone.',
      cssClass: 'dark-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteEvent(),
        },
      ],
    });
    await alert.present();
  }

  private deleteEvent() {
    if (!this.event?._id) return;
    this.eventService.deleteEvent(this.event._id).subscribe({
      next: () => {
        this.showToast('Event deleted', 'success');
        this.router.navigate(['/tabs/events'], { replaceUrl: true });
      },
      error: (err) => {
        console.error('Failed to delete event:', err);
        this.showToast('Could not delete event', 'danger');
      },
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const t = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    t.present();
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
