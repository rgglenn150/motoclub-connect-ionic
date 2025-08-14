import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  registerForm: FormGroup;
  errorMessage: string;

  constructor(private formBuilder: FormBuilder, private http: HttpClient, private router: Router) {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.compose([Validators.required, Validators.email])],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    this.http.post('http://localhost:4200/api/auth/signup', this.registerForm.value).subscribe(
      (data: any) => {
        localStorage.setItem('token', data.token);
        this.router.navigate(['/home']);
      },
      (error) => {
        this.errorMessage = error.error.message;
      }
    );
  }

  // New method to navigate to the login page
  goToLogin() {
    this.router.navigate(['/login']);
  }
}
