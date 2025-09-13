import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { WeatherWidgetComponent } from './weather-widget.component';
import { WeatherService } from '../../service/weather.service';
import { WeatherData } from '../../models/weather.model';

describe('WeatherWidgetComponent', () => {
  let component: WeatherWidgetComponent;
  let fixture: ComponentFixture<WeatherWidgetComponent>;
  let weatherServiceMock: jasmine.SpyObj<WeatherService>;

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
    }
  };

  beforeEach(async () => {
    const weatherServiceSpy = jasmine.createSpyObj('WeatherService', [
      'getCurrentWeatherForCurrentLocation',
      'getWeatherWithFallback'
    ]);

    await TestBed.configureTestingModule({
      declarations: [WeatherWidgetComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: WeatherService, useValue: weatherServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherWidgetComponent);
    component = fixture.componentInstance;
    weatherServiceMock = TestBed.inject(WeatherService) as jasmine.SpyObj<WeatherService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load weather data on init', () => {
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(weatherServiceMock.getCurrentWeatherForCurrentLocation).toHaveBeenCalled();
    expect(component.weatherData).toEqual(mockWeatherData);
    expect(component.isLoading).toBeFalse();
    expect(component.hasError).toBeFalse();
  });

  it('should use fallback coordinates when provided', () => {
    component.fallbackLatitude = 14.5995;
    component.fallbackLongitude = 120.9842;
    weatherServiceMock.getWeatherWithFallback.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(weatherServiceMock.getWeatherWithFallback).toHaveBeenCalledWith(14.5995, 120.9842);
    expect(component.weatherData).toEqual(mockWeatherData);
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

  it('should cleanup subscription on destroy', () => {
    component.autoRefresh = true;
    component.refreshInterval = 1000;
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));
    
    component.ngOnInit();
    spyOn(component['refreshSubscription']!, 'unsubscribe');
    
    component.ngOnDestroy();
    
    expect(component['refreshSubscription']!.unsubscribe).toHaveBeenCalled();
  });

  it('should not setup auto refresh when disabled', () => {
    component.autoRefresh = false;
    weatherServiceMock.getCurrentWeatherForCurrentLocation.and.returnValue(of(mockWeatherData));

    component.ngOnInit();

    expect(component['refreshSubscription']).toBeUndefined();
  });
});