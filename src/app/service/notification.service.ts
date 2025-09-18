import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface Notification {
  _id: string;
  type: 'join_request' | 'request_approved' | 'request_rejected' | 'new_member' | 'role_change';
  message: string;
  club?: {
    _id: string;
    name: string;
  };
  sender?: {
    _id: string;
    name: string;
  };
  read: boolean;
  createdAt: string;
  data?: any;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private baseUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private pollingSubscription?: Subscription;
  private pollingInterval = 30000; // 30 seconds

  // Public observables
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Start polling when service is initialized
    this.startPolling();
  }

  /**
   * Get notifications with pagination
   */
  getNotifications(page = 1, limit = 20): Observable<NotificationResponse> {
    const params = { page: page.toString(), limit: limit.toString() };
    
    return this.http.get<NotificationResponse>(this.baseUrl, { params })
      .pipe(
        retry(2),
        tap(response => {
          if (page === 1) {
            // If it's the first page, replace all notifications
            this.notificationsSubject.next(response.notifications);
          } else {
            // If it's subsequent pages, append to existing notifications
            const currentNotifications = this.notificationsSubject.value;
            this.notificationsSubject.next([...currentNotifications, ...response.notifications]);
          }
        }),
        catchError(error => {
          console.error('Error fetching notifications:', error);
          throw error;
        })
      );
  }

  /**
   * Mark a specific notification as read
   */
  markAsRead(notificationId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          // Update local notifications state
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.map(notification =>
            notification._id === notificationId
              ? { ...notification, read: true }
              : notification
          );
          this.notificationsSubject.next(updatedNotifications);
          
          // Update unread count
          this.updateLocalUnreadCount();
        }),
        catchError(error => {
          console.error('Error marking notification as read:', error);
          throw error;
        })
      );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.baseUrl}/mark-all-read`, {})
      .pipe(
        tap(() => {
          // Update local notifications state
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.map(notification => ({
            ...notification,
            read: true
          }));
          this.notificationsSubject.next(updatedNotifications);
          
          // Reset unread count
          this.unreadCountSubject.next(0);
        }),
        catchError(error => {
          console.error('Error marking all notifications as read:', error);
          throw error;
        })
      );
  }

  /**
   * Delete a specific notification
   */
  deleteNotification(notificationId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${notificationId}`)
      .pipe(
        tap(() => {
          // Remove from local notifications
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.filter(
            notification => notification._id !== notificationId
          );
          this.notificationsSubject.next(updatedNotifications);
          
          // Update unread count
          this.updateLocalUnreadCount();
        }),
        catchError(error => {
          console.error('Error deleting notification:', error);
          throw error;
        })
      );
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`)
      .pipe(
        tap(response => {
          this.unreadCountSubject.next(response.unreadCount);
        }),
        catchError(error => {
          console.error('Error fetching unread count:', error);
          throw error;
        })
      );
  }

  /**
   * Format notification message based on type
   */
  formatNotificationMessage(notification: Notification): string {
    const templates = {
      join_request: `${notification.sender?.name} wants to join ${notification.club?.name}`,
      request_approved: `Your request to join ${notification.club?.name} was approved`,
      request_rejected: `Your request to join ${notification.club?.name} was rejected`,
      new_member: `${notification.sender?.name} joined ${notification.club?.name}`,
      role_change: `You are now an admin of ${notification.club?.name}`
    };
    
    return templates[notification.type] || notification.message;
  }

  /**
   * Get icon name for notification type
   */
  getNotificationIcon(type: string): string {
    const icons = {
      join_request: 'person-add',
      request_approved: 'checkmark-circle',
      request_rejected: 'close-circle',
      new_member: 'people',
      role_change: 'star'
    };
    
    return icons[type as keyof typeof icons] || 'notifications';
  }

  /**
   * Get color for notification type
   */
  getNotificationColor(type: string): string {
    const colors = {
      join_request: 'primary',
      request_approved: 'success',
      request_rejected: 'danger',
      new_member: 'secondary',
      role_change: 'warning'
    };
    
    return colors[type as keyof typeof colors] || 'medium';
  }

  /**
   * Start polling for unread count updates
   */
  startPolling(): void {
    this.stopPolling(); // Stop any existing polling
    
    // Initial load
    this.getUnreadCount().subscribe();
    
    // Set up polling interval
    this.pollingSubscription = interval(this.pollingInterval).subscribe(() => {
      this.getUnreadCount().subscribe();
    });
  }

  /**
   * Stop polling for updates
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  /**
   * Refresh notifications and unread count
   */
  refresh(): void {
    this.getNotifications(1, 20).subscribe();
    this.getUnreadCount().subscribe();
  }

  /**
   * Update local unread count based on current notifications
   */
  private updateLocalUnreadCount(): void {
    const notifications = this.notificationsSubject.value;
    const unreadCount = notifications.filter(notification => !notification.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  /**
   * Handle app becoming active - refresh data
   */
  onAppResume(): void {
    this.refresh();
    this.startPolling();
  }

  /**
   * Handle app going to background - stop polling
   */
  onAppPause(): void {
    this.stopPolling();
  }

  /**
   * Clean up when service is destroyed
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }
}