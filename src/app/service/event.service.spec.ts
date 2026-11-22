import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventService, CreateEventData, Event as ClubEvent } from './event.service';
import { environment } from 'src/environments/environment';

describe('EventService', () => {
  let service: EventService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EventService]
    });
    service = TestBed.inject(EventService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create an event', () => {
    const mockEventData: CreateEventData = {
      name: 'Test Event',
      description: 'Test Event Description',
      startTime: '2025-01-20T09:00:00Z',
      endTime: '2025-01-20T11:00:00Z',
      eventType: 'event',
      club: '507f1f77bcf86cd799439011'
    };

    const mockEventResponse: ClubEvent = {
      _id: '507f1f77bcf86cd799439012',
      name: 'Test Event',
      description: 'Test Event Description',
      startTime: '2025-01-20T09:00:00Z',
      endTime: '2025-01-20T11:00:00Z',
      eventType: 'event',
      club: '507f1f77bcf86cd799439011',
      createdBy: '507f1f77bcf86cd799439013',
      createdAt: '2025-01-13T14:00:00Z',
      updatedAt: '2025-01-13T14:00:00Z'
    };

    service.createEvent(mockEventData).subscribe(event => {
      expect(event).toEqual(mockEventResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/event/create`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockEventData);
    req.flush(mockEventResponse);

    // A club-scoped event refreshes that club's event list
    const refresh = httpMock.expectOne(`${environment.apiUrl}/event/club/${mockEventData.club}?filter=upcoming`);
    expect(refresh.request.method).toBe('GET');
    refresh.flush([]);
  });

  it('should get all clubs', () => {
    const mockClubs = [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Club',
        description: 'Test Club Description',
        members: []
      }
    ];
    service.getAllClubs().subscribe(clubs => {
      expect(clubs).toEqual(mockClubs);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/club`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClubs);
  });

  describe('club events filter (spec 010)', () => {
    const clubId = '507f1f77bcf86cd799439011';
    const clubUrl = `${environment.apiUrl}/event/club/${clubId}`;
    const event = (name: string): ClubEvent => ({
      _id: name,
      name,
      description: '',
      startTime: '2026-11-24T09:00:00Z',
      endTime: '',
      eventType: 'ride',
      club: clubId,
      createdBy: 'u1',
      createdAt: '',
      updatedAt: '',
    });

    it('asks for upcoming events by default', () => {
      service.getEventsByClub(clubId).subscribe();
      httpMock.expectOne(`${clubUrl}?filter=upcoming`).flush([]);
    });

    it('sends the given filter', () => {
      service.getEventsByClub(clubId, 'past').subscribe();
      httpMock.expectOne(`${clubUrl}?filter=past`).flush([]);
    });

    it('pushes the result to the club events stream', () => {
      let shown: ClubEvent[] = [];
      service.getClubEventsObservable(clubId).subscribe((events) => (shown = events));
      service.getEventsByClub(clubId).subscribe();
      httpMock.expectOne(`${clubUrl}?filter=upcoming`).flush([event('a')]);
      expect(shown.map((e) => e.name)).toEqual(['a']);
    });

    it('refreshes with the filter last asked for', () => {
      service.getEventsByClub(clubId, 'past').subscribe();
      httpMock.expectOne(`${clubUrl}?filter=past`).flush([]);
      service.refreshClubEvents(clubId);
      httpMock.expectOne(`${clubUrl}?filter=past`).flush([]);
    });

    it('ignores a late answer for a filter that is no longer selected', () => {
      let shown: ClubEvent[] = [];
      service.getClubEventsObservable(clubId).subscribe((events) => (shown = events));
      service.getEventsByClub(clubId, 'upcoming').subscribe();
      service.getEventsByClub(clubId, 'past').subscribe();
      const slowUpcoming = httpMock.expectOne(`${clubUrl}?filter=upcoming`);
      httpMock.expectOne(`${clubUrl}?filter=past`).flush([event('old ride')]);
      slowUpcoming.flush([event('next ride')]);
      expect(shown.map((e) => e.name)).toEqual(['old ride']);
    });
  });
});
