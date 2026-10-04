import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { of } from 'rxjs';
import { ClubHomePage } from './club-home.page';
import { ClubService } from '../../../service/club.service';

describe('ClubHomePage', () => {
  let component: ClubHomePage;
  let fixture: ComponentFixture<ClubHomePage>;
  let mockClubService: jasmine.SpyObj<ClubService>;
  let mockToastController: jasmine.SpyObj<ToastController>;
  let mockLoadingController: jasmine.SpyObj<LoadingController>;

  beforeEach(async () => {
    // Create spy objects for the services
    mockClubService = jasmine.createSpyObj('ClubService', ['getClubDetails', 'joinClub']);
    mockToastController = jasmine.createSpyObj('ToastController', ['create']);
    mockLoadingController = jasmine.createSpyObj('LoadingController', ['create']);
    
    // Mock the loading controller to return a mock loading element
    const mockLoading = jasmine.createSpyObj('Loading', ['present', 'dismiss']);
    mockLoadingController.create.and.returnValue(Promise.resolve(mockLoading));
    
    // Mock the toast controller to return a mock toast element
    const mockToast = jasmine.createSpyObj('Toast', ['present']);
    mockToastController.create.and.returnValue(Promise.resolve(mockToast));
    
    // Mock ActivatedRoute with snapshot.paramMap
    const mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: (key: string) => key === 'id' ? 'test-club-id' : null
        }
      }
    };

    await TestBed.configureTestingModule({
      declarations: [ClubHomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ClubService, useValue: mockClubService },
        { provide: ToastController, useValue: mockToastController },
        { provide: LoadingController, useValue: mockLoadingController }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClubHomePage);
    component = fixture.componentInstance;
    
    // Mock the service to return an observable to prevent actual API calls during tests
    mockClubService.getClubDetails.and.returnValue(of({
      _id: 'test-club-id',
      clubName: 'Test Club',
      location: 'Test Location',
      isPrivate: false,
      members: []
    }));
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
