import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { HomePage } from '../pages/home/home.page';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../service/auth.service';
import { of } from 'rxjs';

import { Tab1Page } from './tab1.page';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getLoggedInUser']);

    TestBed.configureTestingModule({
      declarations: [Tab1Page, HomePage],
      imports: [
        IonicModule.forRoot(),
        ExploreContainerComponentModule,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    const mockUser = { firstName: 'Test', lastName: 'User' };
    authService.getLoggedInUser.and.returnValue(of(mockUser as any));

    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
