import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClubHomePage } from './club-home.page';

describe('ClubHomePage', () => {
  let component: ClubHomePage;
  let fixture: ComponentFixture<ClubHomePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClubHomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
