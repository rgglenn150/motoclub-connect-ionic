import { Component, OnInit, OnDestroy } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../../service/notification.service';

@Component({
  selector: 'app-notification-popover',
  templateUrl: './notification-popover.component.html',
  styleUrls: ['./notification-popover.component.scss'],
})
export class NotificationPopoverComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  loading = true;
  error = '';
  private notificationsSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private popoverController: PopoverController
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  ngOnDestroy() {
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  private loadNotifications() {
    this.loading = true;
    this.error = '';

    // Subscribe to notifications observable
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications.slice(0, 5); // Show only first 5 notifications
        this.loading = false;
      }
    );

    // Load notifications from API
    this.notificationService.getNotifications(1, 5).subscribe({
      next: () => {
        // Data will be updated via subscription
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.error = 'Failed to load notifications';
        this.loading = false;
      }
    });
  }

  async onNotificationClick(notification: Notification) {
    // Mark as read if not already read
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe({
        next: () => {
          console.log('Notification marked as read');
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
    }

    // Close popover and navigate
    await this.popoverController.dismiss({
      action: 'navigate',
      club: notification.club,
      notification: notification
    });
  }

  async markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        console.log('All notifications marked as read');
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  async viewAllNotifications() {
    await this.popoverController.dismiss({
      action: 'viewAll'
    });
  }

  async closePopover() {
    await this.popoverController.dismiss();
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getNotificationColor(type: string): string {
    return this.notificationService.getNotificationColor(type);
  }

  formatMessage(notification: Notification): string {
    return this.notificationService.formatNotificationMessage(notification);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks}w ago`;
    }

    return date.toLocaleDateString();
  }

  retry() {
    this.loadNotifications();
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification._id;
  }
}