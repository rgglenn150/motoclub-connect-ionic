import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { ToastController } from '@ionic/angular';
import { EventService, Event } from '../service/event.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.page.html',
  styleUrls: ['./events.page.scss'],
})
export class EventsPage implements OnInit, ViewWillEnter {
  events: Event[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private eventService: EventService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.getEvents();
  }

  ionViewWillEnter() {
    // Reload events when navigating back to the tab
    this.getEvents();
  }

  getEvents() {
    this.isLoading = true;
    this.errorMessage = null;

    this.eventService.getMyClubEvents().subscribe({
      next: (res: Event[]) => {
        this.events = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching my club events:', err);
        this.errorMessage = 'Failed to load events. Please try again.';
        this.isLoading = false;
      }
    });
  }

  async handleRefresh(event: any) {
    try {
      await this.eventService.getMyClubEvents().toPromise().then((res: Event[] | undefined) => {
        if (res) {
          this.events = res;
        }
        this.errorMessage = null;
      });
    } catch (err) {
      console.error('Error refreshing events:', err);
      this.showErrorToast('Failed to refresh events');
    } finally {
      event.target.complete();
    }
  }

  retryLoadEvents() {
    this.getEvents();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top',
    });
    toast.present();
  }

  /**
   * Get the name of the event creator
   * @param createdBy - The createdBy field (can be string or populated user object)
   * @returns The username or name of the creator, or 'Unknown'
   */
  getCreatorName(createdBy: string | { _id?: string; username?: string; name?: string } | undefined): string {
    if (!createdBy) return 'Unknown';
    if (typeof createdBy === 'string') return 'Unknown';
    return createdBy.username || createdBy.name || 'Unknown';
  }

  /**
   * Get the name of the club
   * @param club - The club field (can be string or populated club object)
   * @returns The club name or 'Unknown Club'
   */
  getClubName(club: string | { _id?: string; clubName?: string }): string {
    if (typeof club === 'string') return 'Unknown Club';
    return club.clubName || 'Unknown Club';
  }
}
