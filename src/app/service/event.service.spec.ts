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
});
