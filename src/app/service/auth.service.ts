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

  constructor(private http: HttpClient, private router: Router) {}

  login(loginForm: any) {
    return this.http.post(`${this.baseUrl}/login`, loginForm);
  }

  register(registerForm: any) {
    return this.http
      .post(`${this.baseUrl}/signup`, registerForm);
  }

  logout() {
    this.http
      .post(`${this.baseUrl}/logout`, {})
      .subscribe({
        next: () => {
          console.log('logout');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.log('something went wrong on logout', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
        },
      });
  }

  getLoggedInUser() {
    const user = localStorage.getItem('user');
    console.log('getLoggedInUser', user);
    return user ? JSON.parse(user) : null;
  }
}
