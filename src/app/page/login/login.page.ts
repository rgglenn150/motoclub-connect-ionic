import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { ToastService } from 'src/app/service/utils/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  deferredPrompt: any;
  showInstallButton = false;

  errorMessage: string;

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.compose([Validators.required, Validators.email])],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {}

  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e) {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    this.deferredPrompt = e;
    this.showInstallButton = true;
  }

  login() {
    this.authService.login(this.loginForm.value).subscribe(
      (data: any) => {
        console.log('rgdb data token ', data);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.router.navigate(['/home']);
        this.toastService.presentToast('Login successful !', 'bottom', 5000);
      },
      (error) => {
        this.errorMessage = error.error.message;
        console.log('rgdb error : ', error);
        this.toastService.presentToast('Login failed ! '+ error.message, 'bottom', 5000);
      }
    );
    /* this.http.post('http://localhost:4200/api/auth/login', this.loginForm.value).subscribe(
      (data: any) => {
        localStorage.setItem('token', data.token);
        this.router.navigate(['/home']);
      },
      (error) => {
        this.errorMessage = error.error.message;
        console.log('rgdb error : ',error)
      }
    ); */
  }

  async installPwa() {
    // Show the install prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, so hide the button
    this.showInstallButton = false;
    if (outcome === 'accepted') {
      this.toastService.presentToast('App installed successfully!', 'bottom', 2000);
    } else {
      this.toastService.presentToast('Installation dismissed.', 'bottom', 2000);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
