import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;
  destroySubject$: Subject<void> = new Subject();

  constructor(private http: HttpClient) {}

  login(loginForm: any) {
    return this.http
      .post(`${this.baseUrl}/login`, loginForm)
      .pipe(takeUntil(this.destroySubject$));
  }
}
