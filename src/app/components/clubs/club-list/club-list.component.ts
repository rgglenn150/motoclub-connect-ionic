import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Group, GroupService } from 'src/app/service/group.service';

@Component({
  selector: 'app-club-list',
  templateUrl: './club-list.component.html',
  styleUrls: ['./club-list.component.scss'],
})
export class ClubListComponent implements OnInit {
  // Use an observable to handle the data stream
  clubs$: Observable<Group[]>;
  isLoading = true;
  error: string | null = null;

  constructor(private groupService: GroupService) { }

  ngOnInit() {
    this.loadClubs();
  }

  loadClubs() {
    this.isLoading = true;
    this.error = null;
    this.clubs$ = this.groupService.getAllClubs();
    
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
