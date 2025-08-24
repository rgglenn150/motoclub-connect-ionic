import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { LoadingSpinnerComponent } from '../../components/utils/loading-spinner/loading-spinner.component';

import { RegisterPage } from './register.page';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RegisterPage, LoadingSpinnerComponent],
      imports: [
        IonicModule.forRoot(),
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate form', () => {
    component.registerForm.controls.username.setValue('testuser');
    component.registerForm.controls.firstName.setValue('Test');
    component.registerForm.controls.lastName.setValue('User');
    component.registerForm.controls.email.setValue('test@example.com');
    component.registerForm.controls.password.setValue('123456');
    expect(component.registerForm.valid).toBeTruthy();
  });
});
