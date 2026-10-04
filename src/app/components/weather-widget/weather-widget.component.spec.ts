import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

import { WeatherWidgetComponent } from './weather-widget.component';
import { WeatherService } from '../../service/weather.service';
import { LocationPreferencesService } from '../../service/location-preferences.service';
import { PlacesService } from '../../service/places.service';
import { WeatherData } from '../../models/weather.model';
import { LocationPreferences } from '../../service/location-preferences.service';

describe('WeatherWidgetComponent', () => {
  let component: WeatherWidgetComponent;
  let fixture: ComponentFixture<WeatherWidgetComponent>;
  let weatherServiceMock: jasmine.SpyObj<WeatherService>;
  let locationPreferencesServiceMock: jasmine.SpyObj<LocationPreferencesService>;
  let placesServiceMock: jasmine.SpyObj<PlacesService>;
  let modalControllerMock: jasmine.SpyObj<ModalController>;
  let changeDetectorRefMock: jasmine.SpyObj<ChangeDetectorRef>;
  let mockPreferencesSubject: BehaviorSubject<LocationPreferences>;

  const mockWeatherData: WeatherData = {
    location: {
      latitude: 10.6953,
      longitude: 122.5442,
      timezone: 'Asia/Manila',
      name: 'Iloilo City'
    },
    temperature: {
      current: 28,
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
      lastUpdated: '2025-01-13T14:00:00Z'
    },
    forecast: [
      {
        date: '2025-01-14',
        dayName: 'Tomorrow',
        temperature: { max: 30, min: 22 },
        conditions: { description: 'Sunny', code: 0, iconName: 'sunny-outline' },
        precipitationChance: 10
      },
      {
        date: '2025-01-15',
        dayName: 'Wed',
        temperature: { max: 29, min: 21 },
        conditions: { description: 'Cloudy', code: 3, iconName: 'cloudy-outline' },
        precipitationChance: 30
      },
      {
        date: '2025-01-16',
        dayName: 'Thu',
        temperature: { max: 31, min: 23 },
        conditions: { description: 'Light rain', code: 61, iconName: 'rainy-outline' },
        precipitationChance: 70
      }
    ]
  };

  const mockLocationPreferences: LocationPreferences = {
    useGps: true,
    preferredLocation: undefined,
    locationHistory: [],
    favorites: [],
    fallbackCoordinates: {
      latitude: 14.5995,
      longitude: 120.9842
    }
  };

  beforeEach(async () => {
    mockPreferencesSubject = new BehaviorSubject<LocationPreferences>(mockLocationPreferences);

    const weatherServiceSpy = jasmine.createSpyObj('WeatherService', [
      'getCurrentWeatherForCurrentLocation',
      'getWeatherWithFallback',
      'getCurrentWeather'
    ]);

    const locationPreferencesServiceSpy = jasmine.createSpyObj('LocationPreferencesService', [
      'getCurrentPreferences'
    ], {
      preferences$: mockPreferencesSubject.asObservable()
    });

    const placesServiceSpy = jasmine.createSpyObj('PlacesService', [
      'searchPlaces',
      'getPlaceDetails'
    ]);

    const modalControllerSpy = jasmine.createSpyObj('ModalController', [
      'create'
    ]);

    const changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', [
      'markForCheck',
      'detectChanges'
    ]);

    await TestBed.configureTestingModule({
      declarations: [WeatherWidgetComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: WeatherService, useValue: weatherServiceSpy },
        { provide: LocationPreferencesService, useValue: locationPreferencesServiceSpy },
        { provide: PlacesService, useValue: placesServiceSpy },
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherWidgetComponent);
    component = fixture.componentInstance;
    weatherServiceMock = TestBed.inject(WeatherService) as jasmine.SpyObj<WeatherService>;
    locationPreferencesServiceMock = TestBed.inject(LocationPreferencesService) as jasmine.SpyObj<LocationPreferencesService>;
    placesServiceMock = TestBed.inject(PlacesService) as jasmine.SpyObj<PlacesService>;
    modalControllerMock = TestBed.inject(ModalController) as jasmine.SpyObj<ModalController>;
    changeDetectorRefMock = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;

    // Setup default mock returns
    locationPreferencesServiceMock.getCurrentPreferences.and.returnValue(mockLocationPreferences);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load weather data on init with GPS enabled', () => {
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(weatherServiceMock.getCurrentWeatherForCurrentLocation).toHaveBeenCalled();
    expect(component.weatherData).toEqual(mockWeatherData);
    expect(component.isLoading).toBeFalse();
    expect(component.hasError).toBeFalse();
    expect(changeDetectorRefMock.markForCheck).toHaveBeenCalled();
  });

  it('should use fallback coordinates when provided with GPS enabled', () => {
    component.fallbackLatitude = 14.5995;
    component.fallbackLongitude = 120.9842;
    weatherServiceMock.getWeatherWithFallback.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(weatherServiceMock.getWeatherWithFallback).toHaveBeenCalledWith(14.5995, 120.9842);
    expect(component.weatherData).toEqual(mockWeatherData);
    expect(changeDetectorRefMock.markForCheck).toHaveBeenCalled();
  });

  it('should use preferred location when GPS is disabled', () => {
    const preferencesWithLocation = {
      ...mockLocationPreferences,
      useGps: false,
      preferredLocation: {
        id: 'manila-001',
        name: 'Manila',
        coordinates: { latitude: 14.5995, longitude: 120.9842 },
        timestamp: Date.now(),
        isCustom: true
      }
    };
    locationPreferencesServiceMock.getCurrentPreferences.and.returnValue(preferencesWithLocation);
    weatherServiceMock.getCurrentWeather.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(weatherServiceMock.getCurrentWeather).toHaveBeenCalledWith(14.5995, 120.9842);
    expect(component.weatherData).toEqual(mockWeatherData);
  });

  it('should use fallback coordinates when GPS disabled and no preferred location', () => {
    const preferencesWithoutGps = {
      ...mockLocationPreferences,
      useGps: false,
      preferredLocation: null
    };
    locationPreferencesServiceMock.getCurrentPreferences.and.returnValue(preferencesWithoutGps);
    weatherServiceMock.getCurrentWeather.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(weatherServiceMock.getCurrentWeather).toHaveBeenCalledWith(
      mockLocationPreferences.fallbackCoordinates.latitude,
      mockLocationPreferences.fallbackCoordinates.longitude
    );
  });

  it('should handle errors gracefully', () => {
    const errorMessage = 'Weather service unavailable';
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(throwError(() => new Error(errorMessage)));

    component.ngOnInit();

    expect(component.hasError).toBeTrue();
    expect(component.errorMessage).toBe(errorMessage);
    expect(component.isLoading).toBeFalse();
  });

  it('should refresh weather data when refresh button clicked', () => {
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));

    component.refreshWeatherData();

    expect(weatherServiceMock.getCurrentWeatherForCurrentLocation).toHaveBeenCalled();
  });

  it('should display correct location name', () => {
    component.weatherData = mockWeatherData;

    expect(component.locationName).toBe('Iloilo City');
  });

  it('should display coordinates when no location name available', () => {
    const dataWithoutName = { ...mockWeatherData };
    delete dataWithoutName.location.name;
    component.weatherData = dataWithoutName;

    expect(component.locationName).toBe('10.7°, 122.5°');
  });

  it('should display correct temperature text', () => {
    component.weatherData = mockWeatherData;

    expect(component.temperatureText).toBe('28°C');
  });

  it('should display correct condition text', () => {
    component.weatherData = mockWeatherData;

    expect(component.conditionText).toBe('Partly cloudy');
  });

  it('should display correct icon name', () => {
    component.weatherData = mockWeatherData;

    expect(component.iconName).toBe('partly-sunny-outline');
  });

  it('should cleanup subscriptions on destroy', () => {
    component.autoRefresh = true;
    component.refreshInterval = 1000;
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    const destroySpy = spyOn(component['destroy$'], 'next');
    const destroyCompleteSpy = spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(destroyCompleteSpy).toHaveBeenCalled();
  });

  it('should not setup auto refresh when disabled', () => {
    component.autoRefresh = false;
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(component['refreshSubscription']).toBeUndefined();
  });

  // New tests for enhanced functionality
  describe('Location Preferences Integration', () => {
    it('should reload weather data when preferences change', () => {
      weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));
      component.ngOnInit();

      // Clear previous calls from initialization
      changeDetectorRefMock.markForCheck.calls.reset();

      // Simulate preferences change
      const newPreferences = {
        ...mockLocationPreferences,
        preferredLocation: {
          id: 'cebu-001',
          name: 'Cebu',
          coordinates: { latitude: 10.3157, longitude: 123.8854 },
          timestamp: Date.now(),
          isCustom: true
        }
      };
      locationPreferencesServiceMock.getCurrentPreferences.and.returnValue(newPreferences);
      mockPreferencesSubject.next(newPreferences);

      expect(changeDetectorRefMock.markForCheck).toHaveBeenCalled();
    });
  });

  describe('Flip Animation', () => {
    it('should toggle flip state when toggleFlip is called', () => {
      expect(component.isFlipped).toBeFalse();

      component.toggleFlip();

      expect(component.isFlipped).toBeTrue();
      expect(changeDetectorRefMock.markForCheck).toHaveBeenCalled();

      component.toggleFlip();

      expect(component.isFlipped).toBeFalse();
    });
  });

  describe('Weather Getters', () => {
    beforeEach(() => {
      component.weatherData = mockWeatherData;
    });

    it('should return correct location name from weather data', () => {
      expect(component.locationName).toBe('Iloilo City');
    });

    it('should return location name from preferences when using preferred location', () => {
      const preferencesWithLocation = {
        ...mockLocationPreferences,
        useGps: false,
        preferredLocation: {
          id: 'manila-003',
          name: 'Manila',
          coordinates: { latitude: 14.5995, longitude: 120.9842 },
          timestamp: Date.now(),
          isCustom: true
        }
      };
      locationPreferencesServiceMock.getCurrentPreferences.and.returnValue(preferencesWithLocation);

      expect(component.locationName).toBe('Manila');
    });

    it('should return coordinates when no location name available', () => {
      const dataWithoutName = { ...mockWeatherData };
      delete dataWithoutName.location.name;
      component.weatherData = dataWithoutName;

      expect(component.locationName).toBe('10.7°, 122.5°');
    });

    it('should return correct temperature text', () => {
      expect(component.temperatureText).toBe('28°C');
    });

    it('should return correct condition text', () => {
      expect(component.conditionText).toBe('Partly cloudy');
    });

    it('should return correct icon type for weather code', () => {
      expect(component.iconType).toBe('partly-cloudy');
    });

    it('should return correct weather background class', () => {
      expect(component.weatherBackgroundClass).toBe('weather-bg-partly-cloudy');
    });

    it('should check if forecast data is available', () => {
      expect(component.hasForecast).toBeTrue();

      component.weatherData = { ...mockWeatherData, forecast: [] };
      expect(component.hasForecast).toBeFalse();
    });
  });

  describe('Forecast Functionality', () => {
    beforeEach(() => {
      component.weatherData = mockWeatherData;
    });

    it('should return correct icon type for forecast item', () => {
      expect(component.getForecastIconType(0)).toBe('sunny');
      expect(component.getForecastIconType(3)).toBe('cloudy');
      expect(component.getForecastIconType(61)).toBe('rain');
    });

    it('should return shortened description for forecast', () => {
      expect(component.getForecastShortDescription('Clear sky')).toBe('Clear');
      expect(component.getForecastShortDescription('Heavy rain')).toBe('Heavy Rain');
      expect(component.getForecastShortDescription('Unknown condition')).toBe('Unknown condition');
    });

    it('should track forecast days correctly', () => {
      const mockDay = { date: '2025-01-14' };
      expect(component.trackForecastDay(0, mockDay)).toBe('2025-01-14');
    });
  });

  describe('Descriptive Text Methods', () => {
    it('should return correct humidity description', () => {
      expect(component.getHumidityDescription(25)).toBe('Very dry');
      expect(component.getHumidityDescription(45)).toBe('Comfortable');
      expect(component.getHumidityDescription(70)).toBe('Humid');
      expect(component.getHumidityDescription(85)).toBe('Very humid');
    });

    it('should return correct wind description', () => {
      expect(component.getWindDescription(3)).toBe('Calm');
      expect(component.getWindDescription(10)).toBe('Light breeze');
      expect(component.getWindDescription(20)).toBe('Moderate breeze');
      expect(component.getWindDescription(30)).toBe('Strong breeze');
      expect(component.getWindDescription(50)).toBe('High wind');
      expect(component.getWindDescription(70)).toBe('Very high wind');
    });

    it('should return correct pressure description', () => {
      expect(component.getPressureDescription(995)).toBe('Low pressure');
      expect(component.getPressureDescription(1010)).toBe('Normal pressure');
      expect(component.getPressureDescription(1025)).toBe('High pressure');
      expect(component.getPressureDescription(1035)).toBe('Very high pressure');
    });

    it('should return correct visibility description', () => {
      expect(component.getVisibilityDescription(0.5)).toBe('Very poor');
      expect(component.getVisibilityDescription(3)).toBe('Poor');
      expect(component.getVisibilityDescription(8)).toBe('Moderate');
      expect(component.getVisibilityDescription(15)).toBe('Good');
      expect(component.getVisibilityDescription(25)).toBe('Excellent');
    });

    it('should return correct UV index description', () => {
      expect(component.getUVIndexDescription(1)).toBe('Low');
      expect(component.getUVIndexDescription(4)).toBe('Moderate');
      expect(component.getUVIndexDescription(6)).toBe('High');
      expect(component.getUVIndexDescription(9)).toBe('Very high');
      expect(component.getUVIndexDescription(12)).toBe('Extreme');
    });
  });

  describe('Location Source Indicators', () => {
    it('should return correct location source indicator for GPS', () => {
      expect(component.locationSourceIndicator).toBe('Using GPS location');
      expect(component.locationSourceIcon).toBe('navigate-outline');
    });

    it('should return correct location source indicator for preferred location', () => {
      const preferencesWithLocation = {
        ...mockLocationPreferences,
        useGps: false,
        preferredLocation: {
          id: 'manila-004',
          name: 'Manila',
          coordinates: { latitude: 14.5995, longitude: 120.9842 },
          timestamp: Date.now(),
          isCustom: true
        }
      };
      locationPreferencesServiceMock.getCurrentPreferences.and.returnValue(preferencesWithLocation);

      expect(component.locationSourceIndicator).toBe('Using preferred location');
      expect(component.locationSourceIcon).toBe('star-outline');
    });

    it('should return correct location source indicator for default location', () => {
      const preferencesWithDefault = {
        ...mockLocationPreferences,
        useGps: false,
        preferredLocation: null
      };
      locationPreferencesServiceMock.getCurrentPreferences.and.returnValue(preferencesWithDefault);

      expect(component.locationSourceIndicator).toBe('Using default location');
      expect(component.locationSourceIcon).toBe('location-outline');
    });
  });

  describe('Modal Integration', () => {
    it('should open location preferences modal', async () => {
      const mockModal = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
      };
      modalControllerMock.create.and.returnValue(Promise.resolve(mockModal as any));

      await component.openLocationPreferences();

      expect(modalControllerMock.create).toHaveBeenCalledWith({
        component: jasmine.any(Function),
        cssClass: 'location-preferences-modal'
      });
      expect(mockModal.present).toHaveBeenCalled();
    });
  });

  describe('Network Status and Data Freshness', () => {
    beforeEach(() => {
      component.weatherData = mockWeatherData;
      component.lastUpdated = new Date();
    });

    it('should return correct network status indicators', () => {
      expect(component.networkStatusIcon).toBe('wifi-outline');
      expect(component.networkStatusColor).toBe('success');
    });

    it('should indicate offline status', () => {
      component.networkStatus = { online: false };

      expect(component.networkStatusIcon).toBe('cloud-offline-outline');
      expect(component.networkStatusColor).toBe('danger');
      expect(component.canRefresh).toBeFalse();
      expect(component.statusMessage).toContain('Offline');
    });

    it('should format data freshness text correctly', () => {
      // Just updated
      component.lastUpdated = new Date();
      component['dataAge'] = 30000; // 30 seconds
      expect(component.dataFreshnessText).toBe('Just updated');

      // Minutes ago
      component['dataAge'] = 5 * 60 * 1000; // 5 minutes
      expect(component.dataFreshnessText).toBe('5m ago');

      // Hours ago
      component['dataAge'] = 2 * 60 * 60 * 1000; // 2 hours
      expect(component.dataFreshnessText).toBe('2h ago');
    });

    it('should check if data is stale', () => {
      component['dataAge'] = 10 * 60 * 1000; // 10 minutes
      expect(component.isDataStale).toBeFalse();

      component['dataAge'] = 20 * 60 * 1000; // 20 minutes
      expect(component.isDataStale).toBeTrue();
    });

    it('should format last updated time correctly', () => {
      const testDate = new Date('2025-01-13T14:30:00Z');
      component.lastUpdated = testDate;

      const expectedTime = testDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      expect(component.lastUpdatedText).toBe(expectedTime);
    });
  });

  describe('OnPush Change Detection', () => {
    it('should call markForCheck when weather data loads successfully', () => {
      weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));

      component.loadWeatherData();

      expect(changeDetectorRefMock.markForCheck).toHaveBeenCalled();
    });

    it('should call markForCheck when weather data load fails', () => {
      const errorMessage = 'Network error';
      weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.loadWeatherData();

      expect(changeDetectorRefMock.markForCheck).toHaveBeenCalled();
      expect(component.hasError).toBeTrue();
      expect(component.errorMessage).toBe(errorMessage);
    });

    it('should call markForCheck during flip animation', () => {
      component.toggleFlip();

      expect(changeDetectorRefMock.markForCheck).toHaveBeenCalled();
    });
  });
});