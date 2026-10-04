import { Component, OnInit, ViewChild } from '@angular/core';
import {
  IonInfiniteScroll,
  ViewWillEnter,
  ToastController,
  ActionSheetController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventService, Event, PaginatedEventsResponse, MyClubEventsParams } from '../service/event.service';
import { ClubService } from '../service/club.service';

type EventsFilter = 'upcoming' | 'past' | 'all';
type EventsSegment = 'my-clubs' | 'global';

interface SegmentState {
  events: Event[];
  page: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  searchQuery: string;
  filter: EventsFilter;
}

@Component({
  selector: 'app-events',
  templateUrl: './events.page.html',
  styleUrls: ['./events.page.scss'],
})
export class EventsPage implements OnInit, ViewWillEnter {
  @ViewChild(IonInfiniteScroll) infiniteScroll?: IonInfiniteScroll;

  segment: EventsSegment = 'my-clubs';
  limit = 20;

  state: Record<EventsSegment, SegmentState> = {
    'my-clubs': this.makeInitialState(),
    'global': this.makeInitialState(),
  };

  private currentSub?: Subscription;
  private hasAutoSwitched = false;
  private hasInitiallyLoaded = false;

  constructor(
    private eventService: EventService,
    private clubService: ClubService,
    private toastController: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private router: Router,
  ) {}

  private makeInitialState(): SegmentState {
    return {
      events: [],
      page: 1,
      total: 0,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      errorMessage: null,
      searchQuery: '',
      filter: 'upcoming',
    };
  }

  // Convenience getter for the active segment's state — used heavily by template
  get s(): SegmentState {
    return this.state[this.segment];
  }

  ngOnInit() {
    this.loadEvents(true);
  }

  ionViewWillEnter() {
    // Only re-fetch active segment so we don't reset the inactive bucket
    this.loadEvents(true);
  }

  /**
   * Central loader. reset=true replaces the active segment's list and resets pagination;
   * reset=false appends the next page (infinite scroll).
   */
  loadEvents(reset: boolean) {
    if (this.currentSub) {
      this.currentSub.unsubscribe();
      this.currentSub = undefined;
    }

    const seg = this.segment;
    const st = this.state[seg];

    if (reset) {
      st.page = 1;
      st.isLoading = true;
      st.errorMessage = null;
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = false;
      }
    } else {
      st.page += 1;
      st.isLoadingMore = true;
    }

    const params: MyClubEventsParams = {
      page: st.page,
      limit: this.limit,
      q: st.searchQuery,
      filter: st.filter,
    };

    const obs$ = seg === 'my-clubs'
      ? this.eventService.getMyClubEvents(params)
      : this.eventService.getGlobalEvents(params);

    this.currentSub = obs$.subscribe({
      next: (res: PaginatedEventsResponse) => {
        // Guard: segment may have switched while in flight
        if (this.segment !== seg) return;

        if (reset) {
          st.events = res.events || [];
        } else {
          st.events = [...st.events, ...(res.events || [])];
        }
        st.total = res.total ?? st.events.length;
        st.hasMore = !!res.hasMore;

        st.isLoading = false;
        st.isLoadingMore = false;

        if (this.infiniteScroll) {
          this.infiniteScroll.complete();
          if (!st.hasMore) {
            this.infiniteScroll.disabled = true;
          }
        }

        // Auto-switch to global if the user has zero my-clubs events on first ever load
        if (
          !this.hasAutoSwitched &&
          !this.hasInitiallyLoaded &&
          seg === 'my-clubs' &&
          reset &&
          st.filter === 'upcoming' &&
          !st.searchQuery &&
          st.events.length === 0
        ) {
          this.hasAutoSwitched = true;
          this.hasInitiallyLoaded = true;
          this.segment = 'global';
          this.loadEvents(true);
          return;
        }
        this.hasInitiallyLoaded = true;
      },
      error: (err) => {
        if (this.segment !== seg) return;
        console.error(`Error fetching ${seg} events:`, err);
        if (!reset && st.page > 1) {
          st.page -= 1;
        }
        if (reset) {
          st.errorMessage = 'Failed to load events. Please try again.';
        } else {
          this.showErrorToast('Failed to load more events');
        }
        st.isLoading = false;
        st.isLoadingMore = false;
        if (this.infiniteScroll) {
          this.infiniteScroll.complete();
        }
      },
    });
  }

  onSegmentChange(ev: any) {
    const value = ev?.detail?.value as EventsSegment;
    if (!value || value === this.segment) return;
    this.segment = value;
    // Lazy load on first visit, otherwise keep the cached state
    if (this.state[value].events.length === 0 && !this.state[value].errorMessage) {
      this.loadEvents(true);
    } else if (this.infiniteScroll) {
      this.infiniteScroll.disabled = !this.state[value].hasMore;
    }
  }

  onSearchInput(event: any) {
    const value: string = event?.detail?.value ?? '';
    this.s.searchQuery = value;
    this.loadEvents(true);
  }

  setFilter(filter: EventsFilter) {
    if (this.s.filter === filter) return;
    this.s.filter = filter;
    this.loadEvents(true);
  }

  loadMore() {
    if (!this.s.hasMore || this.s.isLoadingMore) {
      this.infiniteScroll?.complete();
      return;
    }
    this.loadEvents(false);
  }

  handleRefresh(event: any) {
    if (this.currentSub) {
      this.currentSub.unsubscribe();
      this.currentSub = undefined;
    }
    const seg = this.segment;
    const st = this.state[seg];
    st.page = 1;
    st.errorMessage = null;
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }

    const params: MyClubEventsParams = {
      page: 1,
      limit: this.limit,
      q: st.searchQuery,
      filter: st.filter,
    };
    const obs$ = seg === 'my-clubs'
      ? this.eventService.getMyClubEvents(params)
      : this.eventService.getGlobalEvents(params);

    this.currentSub = obs$.subscribe({
      next: (res: PaginatedEventsResponse) => {
        if (this.segment !== seg) {
          event.target.complete();
          return;
        }
        st.events = res.events || [];
        st.total = res.total ?? st.events.length;
        st.hasMore = !!res.hasMore;
        if (this.infiniteScroll && !st.hasMore) {
          this.infiniteScroll.disabled = true;
        }
        event.target.complete();
      },
      error: (err) => {
        console.error('Error refreshing events:', err);
        this.showErrorToast('Failed to refresh events');
        event.target.complete();
      },
    });
  }

  retryLoadEvents() {
    this.loadEvents(true);
  }

  get emptyMessage(): { title: string; subtitle: string } {
    const st = this.s;
    if (st.searchQuery && st.searchQuery.trim().length > 0) {
      return {
        title: 'No events match your search',
        subtitle: 'Try a different keyword or clear the search.',
      };
    }
    if (st.filter === 'past') {
      return {
        title: 'No past events',
        subtitle: 'Past events will appear here.',
      };
    }
    if (this.segment === 'global') {
      return {
        title: 'No global events yet',
        subtitle: 'Be the first to host one for the community.',
      };
    }
    return {
      title: 'No Events Yet',
      subtitle: "You don't have any upcoming events from your clubs.",
    };
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top',
    });
    toast.present();
  }

  private async showInfoToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'top',
    });
    toast.present();
  }

  /**
   * FAB tap: present an action sheet to choose between a club event and a global event.
   */
  async openCreateActionSheet() {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Create New Event',
      cssClass: 'dark-action-sheet',
      buttons: [
        {
          text: 'New Club Event',
          icon: 'shield-outline',
          handler: () => {
            this.startNewClubEvent();
          },
        },
        {
          text: 'New Global Event',
          icon: 'globe-outline',
          handler: () => {
            this.router.navigate(['/events/create-event'], {
              queryParams: { scope: 'global' },
            });
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close',
        },
      ],
    });
    await sheet.present();
  }

  /**
   * For a club-scoped event we need a clubId. Fetch the user's clubs:
   *  - 0  → toast "Join a club first"
   *  - 1  → navigate straight into create-event for that club
   *  - 2+ → present a club picker action sheet
   */
  private async startNewClubEvent() {
    try {
      const res = await this.clubService.getMyClubsPaginated(1, 20).toPromise();
      const clubs: any[] = (res && (res as any).clubs) || [];
      if (clubs.length === 0) {
        this.showInfoToast('Join a club first');
        return;
      }
      if (clubs.length === 1) {
        const id = clubs[0]?._id;
        if (id) {
          this.router.navigate(['/create-event', id]);
        }
        return;
      }
      const buttons = clubs.slice(0, 10).map((c: any) => ({
        text: c.clubName || 'Unnamed Club',
        handler: () => this.router.navigate(['/create-event', c._id]),
      }));
      buttons.push({ text: 'Cancel', role: 'cancel' } as any);
      const sheet = await this.actionSheetCtrl.create({
        header: 'Pick a Club',
        cssClass: 'dark-action-sheet',
        buttons,
      });
      await sheet.present();
    } catch (err) {
      console.error('Failed to load user clubs:', err);
      this.showErrorToast('Could not load your clubs');
    }
  }

  goToCreateGlobal() {
    this.router.navigate(['/events/create-event'], {
      queryParams: { scope: 'global' },
    });
  }

  /**
   * Get the name of the event creator
   */
  getCreatorName(
    createdBy: string | { _id?: string; username?: string; name?: string } | undefined
  ): string {
    if (!createdBy) return 'Unknown';
    if (typeof createdBy === 'string') return 'Unknown';
    return createdBy.username || createdBy.name || 'Unknown';
  }

  /**
   * Get the name of the club
   */
  getClubName(club: string | { _id?: string; clubName?: string } | undefined): string {
    if (!club) return '';
    if (typeof club === 'string') return 'Unknown Club';
    return club.clubName || 'Unknown Club';
  }

  trackByEventId(_index: number, event: Event): string {
    return event._id || String(_index);
  }
}
