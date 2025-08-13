import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
})
export class MePage implements OnInit {

  constructor(private authService: AuthService) { }

  ngOnInit() {

  }

  logout() {
    this.authService.logout();
  }

}
