import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { AuthService } from 'src/app/service/auth.service';
import { LoadingSpinnerComponent } from '../../components/utils/loading-spinner/loading-spinner.component';

import { MePage } from './me.page';

@Component({ template: '' })
class DummyComponent {}

describe('MePage', () => {
  let component: MePage;
  let fixture: ComponentFixture<MePage>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getLoggedInUser']);

    await TestBed.configureTestingModule({
      declarations: [ MePage, LoadingSpinnerComponent, DummyComponent ],
      imports: [
        IonicModule.forRoot(),
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([{ path: 'login', component: DummyComponent }]),
      ],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(MePage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should create', fakeAsync(() => {
    const mockUser = { firstName: 'Test', lastName: 'User' };
    authService.getLoggedInUser.and.returnValue(of(mockUser as any));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component).toBeTruthy();
  }));
});
