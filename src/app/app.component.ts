import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private router: Router) {}


  ngOnInit() {
    const token = localStorage.getItem('token');
    console.log('rgdb token : ', token);
    
    if (!token || token==='undefined') {
      this.router.navigate(['/login']);
    }
  }
}
