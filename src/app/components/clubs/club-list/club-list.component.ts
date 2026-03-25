import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { IonInfiniteScroll } from '@ionic/angular';
import { Club, ClubService } from 'src/app/service/club.service';

@Component({
  selector: 'app-club-list',
  templateUrl: './club-list.component.html',
  styleUrls: ['./club-list.component.scss'],
})
export class ClubListComponent implements OnInit, OnDestroy {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  clubs: Club[] = [];
  isLoading = true;
  isLoadingMore = false;
  error: string | null = null;

  // Pagination state
  currentPage = 1;
  totalPages = 1;
  total = 0;
  pageSize = 15;

  // Search
  searchTerm = '';
  private searchSubject = new Subject<string>();

  // Segment
  activeSegment: 'all' | 'my' = 'all';

  // Sort
  sortBy = 'members';

  private destroy$ = new Subject<void>();

  constructor(private clubService: ClubService, private router: Router) {}

  ngOnInit() {
    // Set up debounced search
    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.searchTerm = term;
        this.resetAndLoad();
      });

    this.loadClubs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: any) {
    const value = event.detail.value || '';
    this.searchSubject.next(value);
  }

  onSegmentChange(event: any) {
    this.activeSegment = event.detail.value;
    this.resetAndLoad();
  }

  private resetAndLoad() {
    this.currentPage = 1;
    this.clubs = [];
    this.totalPages = 1;
    this.total = 0;
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }
    this.loadClubs();
  }

  loadClubs() {
    this.isLoading = true;
    this.error = null;

    const request$ =
      this.activeSegment === 'my'
        ? this.clubService.getMyClubsPaginated(this.currentPage, this.pageSize, this.searchTerm, this.sortBy)
        : this.clubService.getClubsPaginated(this.currentPage, this.pageSize, this.searchTerm, this.sortBy);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.clubs = response.clubs;
        this.total = response.total;
        this.totalPages = response.totalPages;
        this.currentPage = response.page;
        this.isLoading = false;

        // Disable infinite scroll if we're on the last page
        if (this.infiniteScroll && this.currentPage >= this.totalPages) {
          this.infiniteScroll.disabled = true;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to load clubs. Please try again later.';
        console.error(err);
      },
    });
  }

  loadMore(event: any) {
    if (this.currentPage >= this.totalPages) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    this.isLoadingMore = true;
    const nextPage = this.currentPage + 1;

    const request$ =
      this.activeSegment === 'my'
        ? this.clubService.getMyClubsPaginated(nextPage, this.pageSize, this.searchTerm, this.sortBy)
        : this.clubService.getClubsPaginated(nextPage, this.pageSize, this.searchTerm, this.sortBy);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.clubs = [...this.clubs, ...response.clubs];
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.total = response.total;
        this.isLoadingMore = false;
        event.target.complete();

        if (this.currentPage >= this.totalPages) {
          event.target.disabled = true;
        }
      },
      error: (err) => {
        this.isLoadingMore = false;
        event.target.complete();
        console.error('Error loading more clubs:', err);
      },
    });
  }

  // Handle pull-to-refresh
  handleRefresh(event: any) {
    this.currentPage = 1;
    this.clubs = [];
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }

    const request$ =
      this.activeSegment === 'my'
        ? this.clubService.getMyClubsPaginated(1, this.pageSize, this.searchTerm, this.sortBy)
        : this.clubService.getClubsPaginated(1, this.pageSize, this.searchTerm, this.sortBy);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.clubs = response.clubs;
        this.total = response.total;
        this.totalPages = response.totalPages;
        this.currentPage = response.page;
        this.isLoading = false;
        this.error = null;
        event.target.complete();

        if (this.infiniteScroll && this.currentPage >= this.totalPages) {
          this.infiniteScroll.disabled = true;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to load clubs. Please try again later.';
        event.target.complete();
        console.error(err);
      },
    });
  }
}
