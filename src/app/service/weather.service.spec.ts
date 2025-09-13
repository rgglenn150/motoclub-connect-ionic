import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeatherService } from './weather.service';
import { WeatherData, WeatherResponse } from '../models/weather.model';
import { PlacesService } from './places.service';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;
  let placesServiceMock: jasmine.SpyObj<PlacesService>;
  const apiUrl = 'https://api.open-meteo.com/v1/forecast';

  // Mock API response from Open-Meteo
  const mockApiResponse: WeatherResponse = {
    latitude: 10.6953,
    longitude: 122.5442,
    timezone: 'Asia/Manila',
    timezone_abbreviation: 'PST',
    elevation: 10,
    current: {
      time: '2025-01-13T14:00',
      temperature_2m: 28.5,
      relative_humidity_2m: 65,
      apparent_temperature: 32.1,
      weather_code: 2,
      wind_speed_10m: 8.5,
      wind_direction_10m: 180,
      surface_pressure: 1013.25
    }
  };

  // Expected WeatherData structure after transformation
  const expectedWeatherData: WeatherData = {
    location: {
      latitude: 10.6953,
      longitude: 122.5442,
      timezone: 'Asia/Manila'
    },
    temperature: {
      current: 29,
      feelsLike: 32
    },
    conditions: {
      description: 'Partly cloudy',
      code: 2,
      iconName: 'partly-sunny-outline'
    },
    metrics: {
      humidity: 65,
      windSpeed: 8.5,
      pressure: 1013.25
    },
    timestamps: {
      lastUpdated: '2025-01-13T14:00'
    }
  };

  beforeEach(() => {
    const placesServiceSpy = jasmine.createSpyObj('PlacesService', ['getCurrentLocation']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WeatherService,
        { provide: PlacesService, useValue: placesServiceSpy }
      ]
    });
    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);
    placesServiceMock = TestBed.inject(PlacesService) as jasmine.SpyObj<PlacesService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentWeather', () => {
    it('should fetch and transform weather data correctly', () => {
      const latitude = 10.6953;
      const longitude = 122.5442;

      service.getCurrentWeather(latitude, longitude).subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
        expect(weatherData.location.latitude).toBe(latitude);
        expect(weatherData.location.longitude).toBe(longitude);
        expect(weatherData.temperature.current).toBe(29);
        expect(weatherData.conditions.description).toBe('Partly cloudy');
        expect(weatherData.conditions.iconName).toBe('partly-sunny-outline');
      });

      const req = httpMock.expectOne(request => 
        request.url === apiUrl && 
        request.params.get('latitude') === latitude.toString() &&
        request.params.get('longitude') === longitude.toString()
      );

      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('current')).toContain('temperature_2m');
      expect(req.request.params.get('current')).toContain('relative_humidity_2m');
      expect(req.request.params.get('current')).toContain('weather_code');
      expect(req.request.params.get('timezone')).toBe('auto');

      req.flush(mockApiResponse);
    });

    it('should handle HTTP errors appropriately', () => {
      const latitude = 10.6953;
      const longitude = 122.5442;

      service.getCurrentWeather(latitude, longitude).subscribe({
        next: () => fail('Expected an error'),
        error: (error) => {
          expect(error.message).toContain('Weather service is temporarily unavailable');
        }
      });

      const req = httpMock.expectOne(request => request.url === apiUrl);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network errors appropriately', () => {
      const latitude = 10.6953;
      const longitude = 122.5442;

      service.getCurrentWeather(latitude, longitude).subscribe({
        next: () => fail('Expected an error'),
        error: (error) => {
          expect(error.message).toContain('Unable to connect to weather service');
        }
      });

      const req = httpMock.expectOne(request => request.url === apiUrl);
      req.flush('Network Error', { status: 0, statusText: 'Unknown Error' });
    });
  });

  describe('mapWeatherCodeToDescription', () => {
    it('should map weather codes to correct descriptions', () => {
      expect(service.mapWeatherCodeToDescription(0)).toBe('Clear sky');
      expect(service.mapWeatherCodeToDescription(1)).toBe('Mainly clear');
      expect(service.mapWeatherCodeToDescription(2)).toBe('Partly cloudy');
      expect(service.mapWeatherCodeToDescription(3)).toBe('Overcast');
      expect(service.mapWeatherCodeToDescription(61)).toBe('Slight rain');
      expect(service.mapWeatherCodeToDescription(95)).toBe('Thunderstorm');
    });

    it('should return default message for unknown weather codes', () => {
      expect(service.mapWeatherCodeToDescription(999)).toBe('Unknown weather condition');
      expect(service.mapWeatherCodeToDescription(-1)).toBe('Unknown weather condition');
    });
  });

  describe('mapWeatherCodeToIcon', () => {
    it('should map weather codes to correct Ionic icons', () => {
      expect(service.mapWeatherCodeToIcon(0)).toBe('sunny-outline');
      expect(service.mapWeatherCodeToIcon(1)).toBe('partly-sunny-outline');
      expect(service.mapWeatherCodeToIcon(2)).toBe('partly-sunny-outline');
      expect(service.mapWeatherCodeToIcon(3)).toBe('cloudy-outline');
      expect(service.mapWeatherCodeToIcon(61)).toBe('rainy-outline');
      expect(service.mapWeatherCodeToIcon(95)).toBe('thunderstorm-outline');
      expect(service.mapWeatherCodeToIcon(71)).toBe('snow-outline');
    });

    it('should return default icon for unknown weather codes', () => {
      expect(service.mapWeatherCodeToIcon(999)).toBe('help-outline');
      expect(service.mapWeatherCodeToIcon(-1)).toBe('help-outline');
    });
  });

  describe('Data transformation', () => {
    it('should round temperature values correctly', () => {
      const testResponse: WeatherResponse = {
        ...mockApiResponse,
        current: {
          ...mockApiResponse.current,
          temperature_2m: 28.7,
          apparent_temperature: 31.3
        }
      };

      service.getCurrentWeather(10.6953, 122.5442).subscribe(weatherData => {
        expect(weatherData.temperature.current).toBe(29);
        expect(weatherData.temperature.feelsLike).toBe(31);
      });

      const req = httpMock.expectOne(request => request.url === apiUrl);
      req.flush(testResponse);
    });

    it('should handle missing optional fields gracefully', () => {
      const testResponse: WeatherResponse = {
        ...mockApiResponse,
        current: {
          time: '2025-01-13T14:00',
          temperature_2m: 28.5,
          relative_humidity_2m: 65,
          weather_code: 2,
          wind_speed_10m: 8.5
        } as any
      };

      service.getCurrentWeather(10.6953, 122.5442).subscribe(weatherData => {
        expect(weatherData.temperature.feelsLike).toBeUndefined();
        expect(weatherData.metrics.pressure).toBeUndefined();
      });

      const req = httpMock.expectOne(request => request.url === apiUrl);
      req.flush(testResponse);
    });
  });

  describe('Location-based weather methods', () => {
    it('should get current weather for user location when PlacesService returns coordinates', () => {
      const mockLocation = { lat: 14.5995, lng: 120.9842 }; // Manila coordinates
      placesServiceMock.getCurrentLocation.and.returnValue(Promise.resolve(mockLocation));

      service.getCurrentWeatherForCurrentLocation().subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      const req = httpMock.expectOne(request => 
        request.url === apiUrl &&
        request.params.get('latitude') === mockLocation.lat.toString() &&
        request.params.get('longitude') === mockLocation.lng.toString()
      );
      req.flush(mockApiResponse);
    });

    it('should use default location when PlacesService returns null', () => {
      placesServiceMock.getCurrentLocation.and.returnValue(Promise.resolve(null));

      service.getCurrentWeatherForCurrentLocation().subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      const req = httpMock.expectOne(request => 
        request.url === apiUrl &&
        request.params.get('latitude') === '10.6953' &&
        request.params.get('longitude') === '122.5442'
      );
      req.flush(mockApiResponse);
    });

    it('should use default location when PlacesService throws error', () => {
      placesServiceMock.getCurrentLocation.and.returnValue(Promise.reject('Location error'));

      service.getCurrentWeatherForCurrentLocation().subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      const req = httpMock.expectOne(request => 
        request.url === apiUrl &&
        request.params.get('latitude') === '10.6953' &&
        request.params.get('longitude') === '122.5442'
      );
      req.flush(mockApiResponse);
    });

    it('should use user location in getWeatherWithFallback when available', () => {
      const mockLocation = { lat: 14.5995, lng: 120.9842 };
      placesServiceMock.getCurrentLocation.and.returnValue(Promise.resolve(mockLocation));

      service.getWeatherWithFallback(16.4023, 120.596).subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      const req = httpMock.expectOne(request => 
        request.url === apiUrl &&
        request.params.get('latitude') === mockLocation.lat.toString() &&
        request.params.get('longitude') === mockLocation.lng.toString()
      );
      req.flush(mockApiResponse);
    });

    it('should use fallback coordinates when user location unavailable', () => {
      placesServiceMock.getCurrentLocation.and.returnValue(Promise.resolve(null));
      const fallbackLat = 16.4023;
      const fallbackLng = 120.596;

      service.getWeatherWithFallback(fallbackLat, fallbackLng).subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      const req = httpMock.expectOne(request => 
        request.url === apiUrl &&
        request.params.get('latitude') === fallbackLat.toString() &&
        request.params.get('longitude') === fallbackLng.toString()
      );
      req.flush(mockApiResponse);
    });

    it('should use default location when both user location and fallback unavailable', () => {
      placesServiceMock.getCurrentLocation.and.returnValue(Promise.resolve(null));

      service.getWeatherWithFallback().subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      const req = httpMock.expectOne(request => 
        request.url === apiUrl &&
        request.params.get('latitude') === '10.6953' &&
        request.params.get('longitude') === '122.5442'
      );
      req.flush(mockApiResponse);
    });
  });

  describe('Caching functionality', () => {
    it('should cache weather data and serve from cache on subsequent calls', () => {
      const latitude = 10.6953;
      const longitude = 122.5442;

      // First call - should hit API and cache the result
      service.getCurrentWeather(latitude, longitude).subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      const req1 = httpMock.expectOne(request => request.url === apiUrl);
      req1.flush(mockApiResponse);

      // Second call - should serve from cache (no HTTP request)
      service.getCurrentWeather(latitude, longitude).subscribe(weatherData => {
        expect(weatherData).toEqual(expectedWeatherData);
      });

      // Verify no additional HTTP requests were made
      httpMock.verify();
    });

    it('should round coordinates for cache efficiency', () => {
      const latitude1 = 10.69534; // Should round to 10.70
      const longitude1 = 122.54423; // Should round to 122.54
      const latitude2 = 10.69543; // Should also round to 10.70
      const longitude2 = 122.54434; // Should also round to 122.54

      // First call
      service.getCurrentWeather(latitude1, longitude1).subscribe();
      const req1 = httpMock.expectOne(request => request.url === apiUrl);
      req1.flush(mockApiResponse);

      // Second call with slightly different coordinates should use cache
      service.getCurrentWeather(latitude2, longitude2).subscribe();
      
      // Should not make a second HTTP request
      httpMock.verify();
    });

    it('should check if coordinates are cached', () => {
      const latitude = 14.5995;
      const longitude = 120.9842;

      // Initially not cached
      expect(service.isCached(latitude, longitude)).toBeFalse();

      // Make API call to cache data
      service.getCurrentWeather(latitude, longitude).subscribe();
      const req = httpMock.expectOne(request => request.url === apiUrl);
      req.flush(mockApiResponse);

      // Now should be cached
      expect(service.isCached(latitude, longitude)).toBeTrue();
    });

    it('should provide cache status information', () => {
      const status = service.getCacheStatus();
      expect(status.entries).toBeGreaterThanOrEqual(0);
      expect(status.timeout).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('should clear all cached data', () => {
      const latitude = 10.6953;
      const longitude = 122.5442;

      // Cache some data
      service.getCurrentWeather(latitude, longitude).subscribe();
      const req = httpMock.expectOne(request => request.url === apiUrl);
      req.flush(mockApiResponse);

      // Verify it's cached
      expect(service.isCached(latitude, longitude)).toBeTrue();

      // Clear cache
      service.clearCache();

      // Verify it's no longer cached
      expect(service.isCached(latitude, longitude)).toBeFalse();
    });

    it('should clean expired cache entries', () => {
      const latitude = 10.6953;
      const longitude = 122.5442;

      // Cache some data
      service.getCurrentWeather(latitude, longitude).subscribe();
      const req = httpMock.expectOne(request => request.url === apiUrl);
      req.flush(mockApiResponse);

      // Verify it's cached
      expect(service.isCached(latitude, longitude)).toBeTrue();

      // Mock time passage (11 minutes to exceed 10-minute timeout)
      spyOn(Date, 'now').and.returnValue(Date.now() + 11 * 60 * 1000);

      // Cache should now be expired - next call should hit API
      service.getCurrentWeather(latitude, longitude).subscribe();
      const req2 = httpMock.expectOne(request => request.url === apiUrl);
      req2.flush(mockApiResponse);
    });
  });
});