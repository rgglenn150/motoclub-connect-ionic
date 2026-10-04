import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ClubListComponent } from '../components/clubs/club-list/club-list.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
  @ViewChild(ClubListComponent) clubListComponent!: ClubListComponent;

  constructor(private router: Router) {}

  createClub() {
    this.router.navigate(['/clubs/create']);
  }

  handleRefresh(event: any) {
    if (this.clubListComponent) {
      this.clubListComponent.handleRefresh(event);
    } else {
      event.target.complete();
    }
  }
}
