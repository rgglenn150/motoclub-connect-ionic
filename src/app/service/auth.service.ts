import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;
  destroySubject$: Subject<void> = new Subject();

  constructor(private http: HttpClient, private router: Router) {}

  login(loginForm: any) {
    return this.http
      .post(`${this.baseUrl}/login`, loginForm)
      .pipe(takeUntil(this.destroySubject$));
  }

  logout() {
    this.http.post(`${this.baseUrl}/logout`, {}).pipe(
      takeUntil(this.destroySubject$)
    ).subscribe({
      next: () => {
        console.log('logout');
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.log('something went wrong on logout', error);
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      }
    });
  }
}
