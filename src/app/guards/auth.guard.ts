import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url);
  }

  private async checkAuth(url: string): Promise<boolean> {
    const token = localStorage.getItem('token');
    const user = this.authService.getLoggedInUser();

    if (token && user) {
      // Check if token is expired (basic check)
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (tokenPayload.exp && tokenPayload.exp > currentTime) {
          return true; // Token is valid
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }

    // Token is invalid or missing
    await this.showAuthRequiredMessage();
    
    // Store the attempted URL for redirecting after login
    localStorage.setItem('redirectUrl', url);
    
    // Redirect to login page
    this.router.navigate(['/login']);
    return false;
  }

  private async showAuthRequiredMessage(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Please log in to access this page.',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }
}