import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Platform, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { NotificationService } from './service/notification.service';
import { AuthService } from './service/auth.service';
import { PwaUpdateService } from './service/pwa-update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  private pwaUpdateSubscription?: Subscription;
  private updateToast?: HTMLIonToastElement;

  constructor(
    private router: Router, 
    private http: HttpClient,
    private platform: Platform,
    private notificationService: NotificationService,
    private authService: AuthService,
    private pwaUpdateService: PwaUpdateService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    this.wakeupServer();
    
    // Initialize user state from localStorage
    this.authService.initializeUserState();
    
    const isCollectionRoute = /^\/clubs\/[^/]+\/collection\/[^/]+/.test(window.location.pathname);
    if (!token || token === 'undefined') {
      if (!isCollectionRoute) {
        this.router.navigate(['/login']);
      }
    } else {
      // Start notification polling if user is logged in
      this.initializeNotifications();
    }
    this.setupAppStateHandlers();
    this.initializePwaUpdateWatcher();
  }

  ngOnDestroy() {
    this.notificationService.stopPolling();
    this.pwaUpdateSubscription?.unsubscribe();
  }
  private initializeNotifications() {
    // Initialize notification polling
    this.notificationService.startPolling();
  }

  private initializePwaUpdateWatcher() {
    // Detect deploys and prompt the user to reload when the running build is
    // stale (installed iOS PWAs can keep serving an old version for days).
    this.pwaUpdateService.startWatching();
    this.pwaUpdateSubscription = this.pwaUpdateService.updateAvailable$.subscribe(
      (available) => {
        if (available) {
          void this.showUpdatePrompt();
        }
      },
    );
  }

  private async showUpdatePrompt() {
    if (this.updateToast) {
      // Already prompting.
      return;
    }
    const toast = await this.toastController.create({
      message: 'A new version of MotoClub Connect is available.',
      position: 'bottom',
      duration: 0,
      buttons: [
        {
          text: 'Later',
          role: 'cancel',
        },
        {
          text: 'Update now',
          handler: () => {
            void this.pwaUpdateService.applyUpdate();
          },
        },
      ],
    });
    this.updateToast = toast;
    toast.onDidDismiss().then(() => {
      this.updateToast = undefined;
    });
    await toast.present();
  }

  private setupAppStateHandlers() {
    // Handle app resume and pause events for notification polling
    this.platform.resume.subscribe(() => {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined') {
        this.notificationService.onAppResume();
      }
      // A resume is the most common moment an installed PWA turns out to be
      // stale (it can sleep through several deploys) — re-check.
      void this.pwaUpdateService.checkForUpdate();
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
