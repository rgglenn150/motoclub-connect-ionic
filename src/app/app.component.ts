import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { NotificationService } from './service/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router, 
    private http: HttpClient,
    private platform: Platform,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    this.wakeupServer();
    if (!token || token === 'undefined') {
      this.router.navigate(['/login']);
    } else {
      // Start notification polling if user is logged in
      this.initializeNotifications();
    }
    this.setupAppStateHandlers();
  }

  ngOnDestroy() {
    this.notificationService.stopPolling();
  }
  private initializeNotifications() {
    // Initialize notification polling
    this.notificationService.startPolling();
  }

  private setupAppStateHandlers() {
    // Handle app resume and pause events for notification polling
    this.platform.resume.subscribe(() => {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined') {
        this.notificationService.onAppResume();
      }
    });

    this.platform.pause.subscribe(() => {
      this.notificationService.onAppPause();
    });
  }

  wakeupServer() {
    // Make a GET request to your backend's wake-up route
    this.http.get(`${environment.apiUrl}/wakeup`).subscribe({
      next: (res) => console.log('Server is awake:', res),
      error: (err) => console.error('Error waking up server:', err),
    });
  }
}
