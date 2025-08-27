import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { FacebookLogin } from '@capacitor-community/facebook-login';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) {
    // Only initialize Facebook login if not in test environment
    if (!this.isTestEnvironment()) {
      this.initializeFacebookLogin();
    }
  }

  private isTestEnvironment(): boolean {
    // Check if we're running in a test environment
    return typeof (window as any).jasmine !== 'undefined' || typeof (window as any).__karma__ !== 'undefined';
  }

  private async initializeFacebookLogin() {
    try {
      await FacebookLogin.initialize({ appId: environment.facebookAppId });
    } catch (error) {
      console.error('Facebook login initialization error:', error);
    }
  }

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
          this.facebookLogout(); // Also logout from Facebook
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.log('something went wrong on logout', error);
          this.facebookLogout(); // Also logout from Facebook
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

  async facebookLogin() {
    try {
      const result = await FacebookLogin.login({
        permissions: ['email', 'public_profile']
      });

      if (result.accessToken) {
        // Send the access token to the backend for verification and user creation/login
        return this.http.post(`${this.baseUrl}/facebook`, {
          accessToken: result.accessToken.token
        });
      } else {
        throw new Error('Facebook login failed - no access token received');
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      throw error;
    }
  }

  async facebookRegister() {
    try {
      const result = await FacebookLogin.login({
        permissions: ['email', 'public_profile']
      });

      if (result.accessToken) {
        // Send the access token to the backend for registration
        return this.http.post(`${this.baseUrl}/facebook/register`, {
          accessToken: result.accessToken.token
        });
      } else {
        throw new Error('Facebook registration failed - no access token received');
      }
    } catch (error) {
      console.error('Facebook registration error:', error);
      throw error;
    }
  }

  async facebookLogout() {
    try {
      await FacebookLogin.logout();
    } catch (error) {
      console.error('Facebook logout error:', error);
    }
  }
}
