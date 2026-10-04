import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

  it('should have the correct routerLink for club details', () => {
    clubService.getAllClubs.and.returnValue(of(mockClubs));
    fixture.detectChanges();

    const clubCard = fixture.debugElement.query(By.css('ion-card'));
    const routerLink = clubCard.nativeElement.getAttribute('ng-reflect-router-link');
    expect(routerLink).toBe('/clubs,1');
  });
});
