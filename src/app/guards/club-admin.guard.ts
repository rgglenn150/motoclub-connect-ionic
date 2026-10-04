import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../service/auth.service';
import { ClubService } from '../service/club.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ClubAdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private clubService: ClubService,
    private router: Router,
    private toastController: ToastController
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkClubAdmin(route, state);
  }

  private checkClubAdmin(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // First check if user is authenticated
    const token = localStorage.getItem('token');
    const user = this.authService.getLoggedInUser();

    if (!token || !user) {
      this.showAccessDeniedMessage('Please log in to access this page.');
      this.router.navigate(['/login']);
      return of(false);
    }

    // Get club ID from route parameters
    const clubId = route.paramMap.get('id');
    
    if (!clubId) {
      this.showAccessDeniedMessage('Invalid club ID.');
      this.router.navigate(['/home']);
      return of(false);
    }

    // Check if user is admin of this specific club
    return this.clubService.getMembershipStatus(clubId).pipe(
      map(response => {
        const isAdmin = response.status === 'admin' || response.role === 'admin';
        
        if (isAdmin) {
          return true;
        } else {
          this.showAccessDeniedMessage('Access denied: Only club admins can edit club details.');
          // Navigate back to club page instead of showing an error page
          this.router.navigate(['/clubs', clubId]);
          return false;
        }
      }),
      catchError(error => {
        console.error('Error checking club admin status:', error);
        
        // Handle different error scenarios
        if (error.status === 401) {
          this.showAccessDeniedMessage('Please log in to continue.');
          this.router.navigate(['/login']);
        } else if (error.status === 404) {
          this.showAccessDeniedMessage('Club not found.');
          this.router.navigate(['/home']);
        } else if (error.status === 403) {
          this.showAccessDeniedMessage('Access denied: Only club admins can edit club details.');
          this.router.navigate(['/clubs', clubId]);
        } else {
          this.showAccessDeniedMessage('Unable to verify admin permissions.');
          this.router.navigate(['/clubs', clubId]);
        }
        
        return of(false);
      })
    );
  }

  private async showAccessDeniedMessage(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 4000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}
