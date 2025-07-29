import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RegisterPage } from './register.page';
import { FormBuilder } from '@angular/forms';
import { HttpClient, HttpHandler } from '@angular/common/http';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
  let registerForm: any;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RegisterPage],
      imports: [IonicModule.forRoot()],
      providers: [FormBuilder, HttpClient, HttpHandler],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    registerForm = component.registerForm;
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
    expect(registerForm.valid).toBeTruthy();
  });
});
