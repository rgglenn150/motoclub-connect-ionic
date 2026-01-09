import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UserLocation {
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  profilePhoto?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLocation?: UserLocation;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}

export interface UpdateUsernameData {
  username: string;
  currentPassword: string;
}

export interface UpdateEmailData {
  email: string;
  currentPassword: string;
}

export interface AvailabilityCheck {
  available: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.apiUrl}/user`;

  constructor(private http: HttpClient) { }

  uploadProfilePhoto(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/profile-photo`, formData);
  }

  getCurrentUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`);
  }

  updateProfile(data: UpdateProfileData): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me/profile`, data);
  }

  updateUsername(data: UpdateUsernameData): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me/username`, data);
  }

  updateEmail(data: UpdateEmailData): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me/email`, data);
  }

  checkUsernameAvailability(username: string): Observable<AvailabilityCheck> {
    return this.http.get<AvailabilityCheck>(`${this.apiUrl}/check-username/${username}`);
  }

  checkEmailAvailability(email: string): Observable<AvailabilityCheck> {
    return this.http.get<AvailabilityCheck>(`${this.apiUrl}/check-email/${encodeURIComponent(email)}`);
  }

  getUserLocation(): Observable<UserLocation> {
    return this.http.get<UserLocation>(`${this.apiUrl}/me/location`);
  }

  updateUserLocation(latitude: number, longitude: number): Observable<UserLocation> {
    return this.http.put<UserLocation>(`${this.apiUrl}/me/location`, { latitude, longitude });
  }
}
