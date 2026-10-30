import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { Club, ClubService } from 'src/app/service/club.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { ClubListComponent } from './club-list.component';

describe('ClubListComponent', () => {
  let component: ClubListComponent;
  let fixture: ComponentFixture<ClubListComponent>;
  let clubService: jasmine.SpyObj<ClubService>;

  const mockClubs: Club[] = [
    { id: '1', clubName: 'Test Club 1', description: 'Test Description 1', isPrivate: false },
    { id: '2', clubName: 'Test Club 2', description: 'Test Description 2', isPrivate: true },
  ];
  const page = { message: 'ok', clubs: mockClubs, total: 2, page: 1, totalPages: 1 };

  beforeEach(waitForAsync(() => {
    const clubServiceSpy = jasmine.createSpyObj('ClubService', ['getClubsPaginated', 'getMyClubsPaginated']);

    TestBed.configureTestingModule({
      declarations: [ClubListComponent],
      imports: [IonicModule.forRoot(), RouterTestingModule.withRoutes([]), SharedModule],
      providers: [{ provide: ClubService, useValue: clubServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubListComponent);
    component = fixture.componentInstance;
    clubService = TestBed.inject(ClubService) as jasmine.SpyObj<ClubService>;
    clubService.getClubsPaginated.and.returnValue(of(page));
    clubService.getMyClubsPaginated.and.returnValue(of(page));
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the first page of all clubs on init', () => {
    fixture.detectChanges();
    expect(clubService.getClubsPaginated).toHaveBeenCalledWith(1, component.pageSize, '', 'members');
    expect(component.clubs).toEqual(mockClubs);
    expect(component.total).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should have the correct routerLink for club details', () => {
    fixture.detectChanges();

    const clubCard = fixture.debugElement.query(By.css('ion-card.asphalt-card'));
    const routerLink = clubCard.nativeElement.getAttribute('ng-reflect-router-link');
    expect(routerLink).toBe('/clubs,1');
  });
});
