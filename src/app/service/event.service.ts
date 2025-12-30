import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

// Geolocation interface
export interface Geolocation {
  latitude: number;
  longitude: number;
  placeName: string;
}

// Event interface matching the backend EventModel structure
export interface Event {
  _id?: string;
  name: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  geolocation?: Geolocation;
  eventType: 'ride' | 'meeting' | 'meetup' | 'event';
  club: string | { _id?: string; clubName?: string }; // Can be ObjectId or populated club object
  createdBy?: string | { _id?: string; username?: string; name?: string }; // Can be ObjectId or populated user object
  imageUrl?: string;
  imagePublicId?: string;
  isPrivate?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Event creation data interface
export interface CreateEventData {
  name: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  geolocation?: Geolocation;
  eventType: 'ride' | 'meeting' | 'meetup' | 'event';
  club: string;
  isPrivate?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private baseUrl = `${environment.apiUrl}/event`;
  private clubBaseUrl = `${environment.apiUrl}/club`;

  // BehaviorSubject to maintain event state per club
  // Map structure: clubId -> BehaviorSubject<Event[]>
  private clubEventsSubjects = new Map<string, BehaviorSubject<Event[]>>();

  constructor(private http: HttpClient) { }

  /**
   * Get or create a BehaviorSubject for a specific club
   * @param clubId - The ID of the club
   * @returns BehaviorSubject for the club's events
   */
  private getClubEventsSubject(clubId: string): BehaviorSubject<Event[]> {
    if (!this.clubEventsSubjects.has(clubId)) {
      this.clubEventsSubjects.set(clubId, new BehaviorSubject<Event[]>([]));
    }
    return this.clubEventsSubjects.get(clubId)!;
  }

  /**
   * Get Observable for a club's events that components can subscribe to
   * @param clubId - The ID of the club
   * @returns Observable of events for the club
   */
  getClubEventsObservable(clubId: string): Observable<Event[]> {
    return this.getClubEventsSubject(clubId).asObservable();
  }

  /**
   * Get events for a specific club
   * @param clubId - The ID of the club
   * @returns Observable with the events data
   */
  getEventsByClub(clubId: string): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/club/${clubId}`)
      .pipe(
        tap(events => {
          // Update the BehaviorSubject with fresh data
          this.getClubEventsSubject(clubId).next(events);
        }),
        catchError(error => {
          console.error('Error fetching events for club:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Refresh events for a specific club
   * @param clubId - The ID of the club
   * @returns Promise that resolves when refresh is complete
   */
  refreshClubEvents(clubId: string): Promise<Event[]> {
    return this.getEventsByClub(clubId).toPromise() as Promise<Event[]>;
  }

  createEvent(eventData: CreateEventData): Observable<Event> {
    return this.http.post<Event>(`${this.baseUrl}/create`, eventData)
      .pipe(
        tap(newEvent => {
          // Refresh the club's events after creating a new event
          this.refreshClubEvents(eventData.club);
        }),
        catchError(error => {
          console.error('Error creating event:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Upload an image for an existing event
   * @param eventId - The ID of the event
   * @param imageFile - The image file to upload
   * @returns Observable with the updated event data
   */
  uploadEventImage(eventId: string, imageFile: File): Observable<Event> {
    const formData = new FormData();
    formData.append('eventImage', imageFile);

    return this.http.post<Event>(`${this.baseUrl}/${eventId}/image`, formData)
      .pipe(
        catchError(error => {
          console.error('Error uploading event image:', error);
          return throwError(() => error);
        })
      );
  }

  getAllClubs(): Observable<any> {
    return this.http.get(`${this.clubBaseUrl}`);
  }

  getEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching events:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get events from clubs the user is a member of
   * @returns Observable with the events data from user's clubs
   */
  getMyClubEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/my-clubs`)
      .pipe(
        catchError(error => {
          console.error('Error fetching my club events:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a specific event by ID
   * @param eventId - The ID of the event
   * @returns Observable with the event data
   */
  getEventById(eventId: string): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}/${eventId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching event:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update an existing event
   * @param eventId - The ID of the event
   * @param eventData - The updated event data
   * @returns Observable with the updated event
   */
  updateEvent(eventId: string, eventData: Partial<CreateEventData>): Observable<Event> {
    return this.http.put<Event>(`${this.baseUrl}/${eventId}`, eventData)
      .pipe(
        tap(updatedEvent => {
          // Refresh the club's events after updating
          if (updatedEvent.club) {
            const clubId = typeof updatedEvent.club === 'string' ? updatedEvent.club : updatedEvent.club._id;
            if (clubId) {
              this.refreshClubEvents(clubId);
            }
          }
        }),
        catchError(error => {
          console.error('Error updating event:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete an event
   * @param eventId - The ID of the event to delete
   * @param clubId - The ID of the club (needed to refresh the events list)
   * @returns Observable with the deletion result
   */
  deleteEvent(eventId: string, clubId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${eventId}`)
      .pipe(
        tap(() => {
          // Refresh the club's events after deletion
          this.refreshClubEvents(clubId);
        }),
        catchError(error => {
          console.error('Error deleting event:', error);
          return throwError(() => error);
        })
      );
  }
}
