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
}
