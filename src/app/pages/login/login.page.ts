import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { ToastService } from 'src/app/service/utils/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  loginForm: FormGroup;
  deferredPrompt: any;
  showInstallButton = false;
  isLoading: boolean = false; // To control the loading spinner visibility

  errorMessage: string;
  isFacebookLoading: boolean = false;

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


  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e) {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    this.deferredPrompt = e;
    this.showInstallButton = true;
  }

  login() {
    this.isLoading = true; // Show the loading spinner
    this.authService.login(this.loginForm.value).subscribe(
      (data: any) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.router.navigate(['/home']);
        this.toastService.presentToast('Login successful !', 'top', 3000);
        this.isLoading = false; // Hide the loading spinner
      },
      (error) => {
        this.errorMessage = error.error.message;
        this.toastService.presentToast(
          'Login failed ! ' + error.message,
          'top',
          3000
        );

        this.isLoading = false; // Hide the loading spinner
      }
    );
  }

  async installPwa() {
    // Show the install prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, so hide the button
    this.showInstallButton = false;
    if (outcome === 'accepted') {
      this.toastService.presentToast('Installing!', 'top', 2000);
    } else {
      this.toastService.presentToast('Installation dismissed.', 'top', 2000);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  async loginWithFacebook() {
    this.isFacebookLoading = true;
    try {
      const response = await this.authService.facebookLogin();
      
      response.subscribe(
        (data: any) => {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          this.router.navigate(['/home']);
          this.toastService.presentToast('Facebook login successful!', 'top', 3000);
          this.isFacebookLoading = false;
        },
        (error) => {
          this.errorMessage = error.error?.message || 'Facebook login failed';
          this.toastService.presentToast(
            'Facebook login failed! ' + this.errorMessage,
            'top',
            3000
          );
          this.isFacebookLoading = false;
        }
      );
    } catch (error: any) {
      this.errorMessage = error.message || 'Facebook login failed';
      this.toastService.presentToast(
        'Facebook login failed! ' + this.errorMessage,
        'top',
        3000
      );
      this.isFacebookLoading = false;
    }
  }
}
