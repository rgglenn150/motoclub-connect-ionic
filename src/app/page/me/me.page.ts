import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
})
export class MePage implements OnInit {

  constructor(private http:HttpClient, private router:Router) { }

  ngOnInit() {

  }

  logout() {
    this.http.post('http://localhost:4200/api/auth/logout', {}).subscribe(response => {
      // Handle successful logout
      console.log('logout');
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }, error => {
      // Handle logout error
      console.log('something went wrong on logout',error)
    });
  }

}
