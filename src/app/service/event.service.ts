import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  club: string; // ObjectId as string
  createdBy?: string; // ObjectId as string
  imageUrl?: string;
  imagePublicId?: string;
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
}

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private baseUrl = `${environment.apiUrl}/event`;
  private clubBaseUrl = `${environment.apiUrl}/club`;

  constructor(private http: HttpClient) { }

  createEvent(eventData: CreateEventData): Observable<Event> {
    return this.http.post<Event>(`${this.baseUrl}/create`, eventData)
      .pipe(
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
        catchError(error => {
          console.error('Error updating event:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete an event
   * @param eventId - The ID of the event to delete
   * @returns Observable with the deletion result
   */
  deleteEvent(eventId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${eventId}`)
      .pipe(
        catchError(error => {
          console.error('Error deleting event:', error);
          return throwError(() => error);
        })
      );
  }
}
