import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { MePage } from '../page/me/me.page';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LoadingSpinnerComponent } from '../components/utils/loading-spinner/loading-spinner.component';
import { AuthService } from '../service/auth.service';
import { of } from 'rxjs';

import { Tab3Page } from './tab3.page';

@Component({ template: '' })
class DummyComponent {}

describe('Tab3Page', () => {
  let component: Tab3Page;
  let fixture: ComponentFixture<Tab3Page>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(fakeAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getLoggedInUser']);

    TestBed.configureTestingModule({
      declarations: [Tab3Page, MePage, LoadingSpinnerComponent, DummyComponent],
      imports: [
        IonicModule.forRoot(),
        ExploreContainerComponentModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([{ path: 'login', component: DummyComponent }]),
      ],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    const mockUser = { firstName: 'Test', lastName: 'User' };
    authService.getLoggedInUser.and.returnValue(of(mockUser as any));

    fixture.detectChanges();
    flush();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
