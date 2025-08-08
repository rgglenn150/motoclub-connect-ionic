import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventService } from './event.service';
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
    const mockEvent = { name: 'Test Event' };
    service.createEvent(mockEvent).subscribe(event => {
      expect(event).toEqual(mockEvent);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/event/create`);
    expect(req.request.method).toBe('POST');
    req.flush(mockEvent);
  });

  it('should get all clubs', () => {
    const mockClubs = [{ name: 'Test Club' }];
    service.getAllClubs().subscribe(clubs => {
      expect(clubs).toEqual(mockClubs);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/club`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClubs);
  });
});
