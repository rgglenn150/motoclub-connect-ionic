import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Club, ClubService } from 'src/app/service/club.service';

@Component({
  selector: 'app-club-list',
  templateUrl: './club-list.component.html',
  styleUrls: ['./club-list.component.scss'],
})
export class ClubListComponent implements OnInit {
  // Use an observable to handle the data stream
  clubs$: Observable<Club[]>;
  isLoading = true;
  error: string | null = null;

  constructor(private clubService: ClubService, private router: Router) { }

  ngOnInit() {
    this.loadClubs();
  }

  loadClubs() {
    this.isLoading = true;
    this.error = null;
    this.clubs$ = this.clubService.getAllClubs();

    // Handle loading and error states
    this.clubs$.subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to load clubs. Please try again later.';
        console.error(err);
      }
    });
  }

  // Handle pull-to-refresh
  handleRefresh(event: any) {
    this.loadClubs();
    this.clubs$.subscribe(() => {
      event.target.complete();
    });
  }


}
