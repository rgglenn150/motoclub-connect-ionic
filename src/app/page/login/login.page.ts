import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;

  errorMessage: string;

  constructor(private router: Router, private formBuilder: FormBuilder, private http: HttpClient) {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.compose([Validators.required, Validators.email])],
      password: ['', Validators.required],
    })
  }

  ngOnInit() {
  }

  login() {
    this.http.post('http://localhost:4200/api/auth/login', this.loginForm.value).subscribe(
      (data: any) => {
        localStorage.setItem('token', data.token);
        this.router.navigate(['/home']);
      },
      (error) => {
        this.errorMessage = error.error.message;
        console.log('rgdb error : ',error)
      }
    );
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

}
