import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { Club, ClubService } from 'src/app/service/club.service';
import { ClubListComponent } from './club-list.component';
import { Router } from '@angular/router';

describe('ClubListComponent', () => {
  let component: ClubListComponent;
  let fixture: ComponentFixture<ClubListComponent>;
  let clubService: jasmine.SpyObj<ClubService>;
  let router: Router;

  const mockClubs: Club[] = [
    { id: '1', clubName: 'Test Club 1', description: 'Test Description 1', isPrivate: false },
    { id: '2', clubName: 'Test Club 2', description: 'Test Description 2', isPrivate: true },
  ];

  beforeEach(waitForAsync(() => {
    const clubServiceSpy = jasmine.createSpyObj('ClubService', ['getAllClubs']);

    TestBed.configureTestingModule({
      declarations: [ClubListComponent],
      imports: [IonicModule.forRoot(), RouterTestingModule.withRoutes([])],
      providers: [{ provide: ClubService, useValue: clubServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubListComponent);
    component = fixture.componentInstance;
    clubService = TestBed.inject(ClubService) as jasmine.SpyObj<ClubService>;
    router = TestBed.inject(Router);
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load clubs on init', () => {
    clubService.getAllClubs.and.returnValue(of(mockClubs));
    fixture.detectChanges();
    expect(component.clubs$).toBeDefined();
    component.clubs$.subscribe(clubs => {
      expect(clubs.length).toBe(2);
      expect(clubs).toEqual(mockClubs);
    });
  });

  it('should navigate to club details on click', () => {
    clubService.getAllClubs.and.returnValue(of(mockClubs));
    fixture.detectChanges();

    const navigateSpy = spyOn(router, 'navigate');

    const clubCard = fixture.nativeElement.querySelector('ion-card');
    clubCard.click();

    fixture.whenStable().then(() => {
      expect(navigateSpy).toHaveBeenCalledWith(['/club-details', '1']);
    });
  });
});
