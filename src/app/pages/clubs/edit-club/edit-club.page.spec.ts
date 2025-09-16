import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditClubPage } from './edit-club.page';

describe('EditClubPage', () => {
  let component: EditClubPage;
  let fixture: ComponentFixture<EditClubPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditClubPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
