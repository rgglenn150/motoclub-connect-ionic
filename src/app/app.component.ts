import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    this.wakeupServer();
    if (!token || token === 'undefined') {
      this.router.navigate(['/login']);
    }
  }
  wakeupServer() {
    // Make a GET request to your backend's wake-up route
    this.http.get(`${environment.apiUrl}/wakeup`).subscribe({
      next: (res) => console.log('Server is awake:', res),
      error: (err) => console.error('Error waking up server:', err),
    });
  }
}
