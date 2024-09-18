import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  destroySubject$: Subject<void> = new Subject();

  constructor(private http: HttpClient) {}

  login(loginForm: any) {
    return this.http
      .post('http://localhost:4200/api/auth/login', loginForm)
      .pipe(takeUntil(this.destroySubject$));
  }
}
