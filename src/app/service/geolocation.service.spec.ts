import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GeolocationService } from './geolocation.service';
import { MapboxGeocodingResponse } from '../models/geolocation.model';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let httpMock: HttpTestingController;

  const mockMapboxResponse: MapboxGeocodingResponse = {
    type: 'FeatureCollection',
    query: [121.0244, 14.5547],
    features: [
      {
        id: 'address.123',
        type: 'Feature',
        place_type: ['address'],
        relevance: 0.99,
        properties: {
          accuracy: 'rooftop'
        },
        text: '123 Sample Street',
        place_name: '123 Sample Street, Makati, Metro Manila, Philippines',
        center: [121.0244, 14.5547],
        geometry: {
          type: 'Point',
          coordinates: [121.0244, 14.5547]
        }
      }
    ],
    attribution: 'NOTICE'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GeolocationService]
    });
    service = TestBed.inject(GeolocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return cached result if available', () => {
    const lat = 14.5547;
    const lng = 121.0244;
    const expectedAddress = '123 Sample Street, Makati, Metro Manila';

    // First call - should make HTTP request
    service.reverseGeocode(lat, lng).subscribe(address => {
      expect(address).toBe(expectedAddress);
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('mapbox.com/geocoding') &&
      request.url.includes(`${lng},${lat}`)
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockMapboxResponse);

    // Second call - should use cache
    service.reverseGeocode(lat, lng).subscribe(address => {
      expect(address).toBe(expectedAddress);
    });

    // No additional HTTP request should be made
    httpMock.expectNone(request => request.url.includes('mapbox.com/geocoding'));
  });

  it('should handle invalid coordinates', () => {
    service.reverseGeocode(91, 181).subscribe(address => {
      expect(address).toBeNull();
    });

    service.reverseGeocode(NaN, 121).subscribe(address => {
      expect(address).toBeNull();
    });

    // No HTTP requests should be made for invalid coordinates
    httpMock.expectNone(request => request.url.includes('mapbox.com/geocoding'));
  });

  it('should handle HTTP errors gracefully', () => {
    const lat = 14.5547;
    const lng = 121.0244;

    service.reverseGeocode(lat, lng).subscribe(address => {
      expect(address).toBeNull();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('mapbox.com/geocoding')
    );
    req.flush('Error', { status: 429, statusText: 'Rate Limit Exceeded' });
  });

  it('should clear cache when requested', () => {
    expect(service.getCacheSize()).toBe(0);

    // Add something to cache
    service.reverseGeocode(14.5547, 121.0244).subscribe();

    const req = httpMock.expectOne(request =>
      request.url.includes('mapbox.com/geocoding')
    );
    req.flush(mockMapboxResponse);

    expect(service.getCacheSize()).toBe(1);

    service.clearCache();
    expect(service.getCacheSize()).toBe(0);
  });
});
