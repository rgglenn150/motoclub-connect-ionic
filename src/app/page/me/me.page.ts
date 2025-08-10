import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
})
export class MePage implements OnInit {

  // Placeholder for user data
  user: any = {
    username: 'Rider Glenn',
    joinDate: 'March 2024',
    profilePhotoUrl: 'https://placehold.co/100x100/F59E0B/2D3748?text=R',
    stats: {
      rides: 12,
      kmRidden: 1450,
      clubs: 3
    }
  };

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.fetchUserData();
  }

  fetchUserData() {
    // TODO: Replace with actual API call to your backend
    // this.http.get('http://localhost:4200/api/user').subscribe(response => {
    //   this.user = response;
    // }, error => {
    //   console.error('Error fetching user data', error);
    // });
  }

  logout() {
    this.http.post('http://localhost:4200/api/auth/logout', {}).subscribe(response => {
      console.log('logout successful');
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }, error => {
      console.error('Logout failed', error);
    });
  }

  goTo(page: string) {
    this.router.navigate([`/tabs/me/${page}`]);
  }

}
