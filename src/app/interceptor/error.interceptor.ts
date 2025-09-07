import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private toastController: ToastController
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          // Token is invalid or expired
          this.handleAuthError(error.status);
        }
        return throwError(() => error);
      })
    );
  }

  private async handleAuthError(status: number): Promise<void> {
    // Clear stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Show appropriate message
    const message = status === 401 
      ? 'Your session has expired. Please log in again.'
      : 'Access denied. Please log in again.';
    
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();

    // Redirect to login page
    this.router.navigate(['/login']);
  }
}