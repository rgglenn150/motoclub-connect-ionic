import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/service/auth.service';
import { ClubService } from 'src/app/service/club.service';
import { PlacesService } from 'src/app/service/places.service';
import { UserService } from 'src/app/service/user.service';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let authService: jasmine.SpyObj<AuthService>;
  let clubService: jasmine.SpyObj<ClubService>;
  let placesService: jasmine.SpyObj<PlacesService>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getLoggedInUser']);
    clubService = jasmine.createSpyObj('ClubService', ['getNearbyClubs']);
    clubService.getNearbyClubs.and.returnValue(of({ clubs: [] } as any));
    placesService = jasmine.createSpyObj('PlacesService', ['getLocationPermissionStatus']);
    placesService.getLocationPermissionStatus.and.resolveTo('prompt');
    userService = jasmine.createSpyObj('UserService', ['getUserLocation']);
    userService.getUserLocation.and.returnValue(of({ latitude: 10.7, longitude: 122.56 }));

    TestBed.configureTestingModule({
      declarations: [ HomePage ],
      imports: [IonicModule.forRoot(), HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ClubService, useValue: clubService },
        { provide: PlacesService, useValue: placesService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    const mockUser = { firstName: 'Test', lastName: 'User' };
    authService.getLoggedInUser.and.returnValue(of(mockUser as any));

    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('nearby clubs', () => {
    beforeEach(() => clubService.getNearbyClubs.calls.reset());

    it('searches around the saved location on load when permission has not been granted', async () => {
      await component.loadNearbyClubs();

      expect(clubService.getNearbyClubs).toHaveBeenCalledWith(jasmine.objectContaining({
        useUserLocation: false,
        fallbackCoordinates: { latitude: 10.7, longitude: 122.56 },
      }));
    });

    it('asks for a tap instead of searching when there is no saved location', async () => {
      userService.getUserLocation.and.returnValue(throwError(() => new Error('404')));

      await component.loadNearbyClubs();

      expect(clubService.getNearbyClubs).not.toHaveBeenCalled();
      expect(component.needsLocationForClubs).toBeTrue();
      expect(component.nearbyClubsLoading).toBeFalse();
    });

    it('uses GPS on load when permission is already granted', async () => {
      placesService.getLocationPermissionStatus.and.resolveTo('granted');

      await component.loadNearbyClubs();

      expect(clubService.getNearbyClubs).toHaveBeenCalledWith({ radius: 100, limit: 10 });
    });

    it('uses GPS when the user taps "Use my location"', async () => {
      await component.loadNearbyClubs(true);

      expect(clubService.getNearbyClubs).toHaveBeenCalledWith({ radius: 100, limit: 10 });
    });
  });
});
