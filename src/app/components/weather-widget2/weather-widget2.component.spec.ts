import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { NEVER, of, throwError } from 'rxjs';
import { GeolocationService } from 'src/app/service/geolocation.service';
import { LocationPreferencesService } from 'src/app/service/location-preferences.service';
import { PlacesService } from 'src/app/service/places.service';
import { UserService } from 'src/app/service/user.service';
import { WeatherService } from 'src/app/service/weather.service';

import { WeatherWidget2Component } from './weather-widget2.component';

describe('WeatherWidget2Component', () => {
  let component: WeatherWidget2Component;
  let fixture: ComponentFixture<WeatherWidget2Component>;
  let placesService: jasmine.SpyObj<PlacesService>;
  let userService: jasmine.SpyObj<UserService>;
  let weatherService: jasmine.SpyObj<WeatherService>;

  beforeEach(waitForAsync(() => {
    placesService = jasmine.createSpyObj('PlacesService', [
      'isLocationServiceAvailable',
      'getLocationPermissionStatus',
      'getFastLocation',
      'getHighAccuracyLocation',
    ]);
    placesService.isLocationServiceAvailable.and.resolveTo(true);
    placesService.getLocationPermissionStatus.and.resolveTo('prompt');
    placesService.getFastLocation.and.resolveTo(null);

    userService = jasmine.createSpyObj('UserService', ['getUserLocation', 'updateUserLocation']);
    userService.getUserLocation.and.returnValue(of({ latitude: 10.7, longitude: 122.56 }));

    // Weather requests never emit, so these specs stop at which location was used
    weatherService = jasmine.createSpyObj('WeatherService', [
      'getCurrentWeather',
      'getDefaultLocationWeather',
      'getCurrentWeatherForCurrentLocation',
    ]);
    weatherService.getCurrentWeather.and.returnValue(NEVER);
    weatherService.getDefaultLocationWeather.and.returnValue(NEVER);

    const preferencesService = jasmine.createSpyObj('LocationPreferencesService', ['getCurrentPreferences'], {
      preferences$: NEVER,
    });
    preferencesService.getCurrentPreferences.and.returnValue({ useGps: true });

    TestBed.configureTestingModule({
      declarations: [ WeatherWidget2Component ],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: PlacesService, useValue: placesService },
        { provide: UserService, useValue: userService },
        { provide: WeatherService, useValue: weatherService },
        { provide: LocationPreferencesService, useValue: preferencesService },
        { provide: GeolocationService, useValue: jasmine.createSpyObj('GeolocationService', ['reverseGeocode']) },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherWidget2Component);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not read GPS on load when permission has not been granted', async () => {
    await component.ngOnInit();

    expect(placesService.getFastLocation).not.toHaveBeenCalled();
    expect(placesService.getHighAccuracyLocation).not.toHaveBeenCalled();
    expect(weatherService.getCurrentWeatherForCurrentLocation).not.toHaveBeenCalled();
    expect(weatherService.getCurrentWeather).toHaveBeenCalledWith(10.7, 122.56);
    expect(component.usingFallbackLocation).toBeTrue();
  });

  it('uses the default location without the enable prompt when nothing is saved', async () => {
    userService.getUserLocation.and.returnValue(throwError(() => new Error('404')));

    await component.ngOnInit();

    expect(placesService.getFastLocation).not.toHaveBeenCalled();
    expect(weatherService.getDefaultLocationWeather).toHaveBeenCalled();
    expect(component.showEnableLocationPrompt).toBeFalse();
  });

  it('reads GPS on load when permission is already granted', async () => {
    placesService.getLocationPermissionStatus.and.resolveTo('granted');

    await component.ngOnInit();

    expect(placesService.getFastLocation).toHaveBeenCalled();
  });

  it('reads GPS when the user taps "Update current location"', async () => {
    await component.ngOnInit();

    component.refreshWithFastLocation();

    expect(placesService.getFastLocation).toHaveBeenCalled();
  });
});
