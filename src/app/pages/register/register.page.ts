import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  destroySubject$:Subject<void> = new Subject();
  registerForm: FormGroup;
  errorMessage: string;
  isLoading: boolean = false; // To control the loading spinner visibility
  isFacebookLoading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.compose([Validators.required, Validators.email])],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    this.isLoading = true; // Show the loading spinner
    this.authService.register(this.registerForm.value).pipe(
      takeUntil(this.destroySubject$))
      .subscribe(
        (data: any) => {
          localStorage.setItem('token', data.token);
           localStorage.setItem('user', JSON.stringify(data.user));
          this.router.navigate(['/home']);
          this.isLoading = false; // Hide the loading spinner
        },
        (error) => {
          this.errorMessage = error.error.message;
          this.isLoading = false; // Hide the loading spinner
        }
      );
  }

  // New method to navigate to the login page
  goToLogin() {
    this.router.navigate(['/login']);
  }

  async registerWithFacebook() {
    this.isFacebookLoading = true;
    try {
      const response = await this.authService.facebookRegister();
      
      response.pipe(takeUntil(this.destroySubject$)).subscribe(
        (data: any) => {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          this.router.navigate(['/home']);
          this.isFacebookLoading = false;
        },
        (error) => {
          this.errorMessage = error.error?.message || 'Facebook registration failed';
          this.isFacebookLoading = false;
        }
      );
    } catch (error: any) {
      this.errorMessage = error.message || 'Facebook registration failed';
      this.isFacebookLoading = false;
    }
  }
}
