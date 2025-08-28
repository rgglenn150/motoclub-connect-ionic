import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../service/notification.service';
import { NotificationPopoverComponent } from './notification-popover/notification-popover.component';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  private unreadCountSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private popoverController: PopoverController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUnreadCount();
  }

  ngOnDestroy() {
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
  }

  private loadUnreadCount() {
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      count => {
        this.unreadCount = count;
      }
    );
  }

  async openNotifications(event: Event) {
    const popover = await this.popoverController.create({
      component: NotificationPopoverComponent,
      event: event,
      translucent: true,
      showBackdrop: true,
      cssClass: 'notification-popover',
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();
    
    // Handle navigation if a notification was clicked
    if (data && data.action === 'navigate' && data.club) {
      this.navigateToClub(data.club._id);
    } else if (data && data.action === 'viewAll') {
      this.router.navigate(['/notifications']);
    }
  }

  private navigateToClub(clubId: string) {
    this.router.navigate(['/clubs', clubId]);
  }

  // Method to refresh notifications manually
  refresh() {
    this.notificationService.refresh();
  }
}