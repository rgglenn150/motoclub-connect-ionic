import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../service/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  loading = true;
  loadingMore = false;
  error = '';
  currentPage = 1;
  totalPages = 1;
  hasMore = false;

  private notificationsSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  ngOnDestroy() {
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  loadNotifications(refresh = false) {
    if (refresh) {
      this.currentPage = 1;
      this.notifications = [];
    }

    this.loading = refresh || this.currentPage === 1;
    this.error = '';

    this.notificationService.getNotifications(this.currentPage, 20).subscribe({
      next: (response) => {
        if (refresh || this.currentPage === 1) {
          this.notifications = response.notifications;
        } else {
          this.notifications = [...this.notifications, ...response.notifications];
        }

        this.totalPages = Math.ceil(response.pagination.total / response.pagination.limit);
        this.hasMore = this.currentPage < this.totalPages;
        this.loading = false;
        this.loadingMore = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.error = 'Failed to load notifications';
        this.loading = false;
        this.loadingMore = false;
        this.showErrorToast('Failed to load notifications');
      }
    });
  }

  loadMore(event?: any) {
    if (!this.hasMore || this.loadingMore) {
      if (event) {
        event.target.complete();
      }
      return;
    }

    this.loadingMore = true;
    this.currentPage++;
    
    this.notificationService.getNotifications(this.currentPage, 20).subscribe({
      next: (response) => {
        this.notifications = [...this.notifications, ...response.notifications];
        this.totalPages = Math.ceil(response.pagination.total / response.pagination.limit);
        this.hasMore = this.currentPage < this.totalPages;
        this.loadingMore = false;
        
        if (event) {
          event.target.complete();
        }
      },
      error: (error) => {
        console.error('Error loading more notifications:', error);
        this.loadingMore = false;
        this.showErrorToast('Failed to load more notifications');
        
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  onRefresh(event: any) {
    this.loadNotifications(true);
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  onNotificationClick(notification: Notification) {
    // Mark as read if not already read
    if (!notification.read) {
      this.markAsRead(notification._id);
    }

    // Navigate based on notification type
    this.navigateFromNotification(notification);
  }

  private navigateFromNotification(notification: Notification) {
    if (!notification.club) {
      return;
    }

    const clubId = notification.club._id;

    switch (notification.type) {
      case 'join_request':
        // Navigate to club admin panel or members management
        this.router.navigate(['/clubs', clubId, 'members']);
        break;
      case 'request_approved':
      case 'request_rejected':
      case 'new_member':
      case 'role_change':
        // Navigate to club home
        this.router.navigate(['/clubs', clubId]);
        break;
      default:
        this.router.navigate(['/clubs', clubId]);
    }
  }

  markAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        // Update local state
        this.notifications = this.notifications.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        );
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
        this.showErrorToast('Failed to mark notification as read');
      }
    });
  }

  async markAllAsRead() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    if (unreadCount === 0) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Mark All as Read',
      message: `Are you sure you want to mark all ${unreadCount} notifications as read?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Mark All Read',
          handler: () => {
            this.performMarkAllAsRead();
          }
        }
      ]
    });

    await alert.present();
  }

  private performMarkAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(notification => ({
          ...notification,
          read: true
        }));
        this.showSuccessToast('All notifications marked as read');
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
        this.showErrorToast('Failed to mark all notifications as read');
      }
    });
  }

  async deleteNotification(notification: Notification, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.performDeleteNotification(notification._id);
          }
        }
      ]
    });

    await alert.present();
  }

  private performDeleteNotification(notificationId: string) {
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(
          notification => notification._id !== notificationId
        );
        this.showSuccessToast('Notification deleted');
      },
      error: (error) => {
        console.error('Error deleting notification:', error);
        this.showErrorToast('Failed to delete notification');
      }
    });
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
    this.loadNotifications(true);
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification._id;
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}