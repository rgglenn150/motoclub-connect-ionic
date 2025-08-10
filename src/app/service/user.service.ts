import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = 'http://localhost:4200/api/user'; // Adjust your API base URL here

  constructor(private http: HttpClient) { }

  uploadProfilePhoto(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/profile-photo`, formData);
  }
}
