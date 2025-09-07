import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  constructor() {
    // Initialize with stored user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.userSubject.next(JSON.parse(storedUser));
    }
  }

  updateUser(userData: any) {
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    // Notify all subscribers
    this.userSubject.next(userData);
  }

  updateUserProperty(property: string, value: any) {
    const currentUser = this.userSubject.value;
    if (currentUser) {
      const updatedUser = { ...currentUser, [property]: value };
      this.updateUser(updatedUser);
    }
  }

  getCurrentUser() {
    return this.userSubject.value;
  }

  clearUser() {
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }
}