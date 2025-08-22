import { AuthService } from '../../service/auth.service';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { UserService } from '../../service/user.service';

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
})
export class MePage implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;

  // Placeholder for user data
  user: any = {
    username: 'Rider Glenn',
    joinDate: 'March 2024',
    profilePhoto: 'https://placehold.co/100x100/F59E0B/2D3748?text=R',
    stats: {
      rides: 12,
      kmRidden: 1450,
      clubs: 3,
    },
  };

  imageChangedEvent: any = null;
  croppedImage: any = '';
  isCropperOpen = false;
  isLoading = false;

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.fetchUserData();
  }

  fetchUserData() {
    this.authService.getLoggedInUser().subscribe(user => {
      this.user = user;
      if (!this.user) {
        console.error('User not found, redirecting to login');
        this.router.navigate(['/login']);
        return;
      }
      console.log('User data fetched:', this.user);
    });
  }

  logout() {
    this.authService.logout();
  }

  goTo(page: string) {
    this.router.navigate([`/tabs/me/${page}`]);
  }

  onProfilePhotoClick() {
    console.log('Profile photo clicked');
    this.fileInput.nativeElement.click();
  }

  fileChangeEvent(event: any): void {
    console.log('File change event:', event);
    this.imageChangedEvent = event;
    this.isCropperOpen = true;
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64;
  }

  imageLoaded() {
    // show cropper
  }

  cropperReady() {
    // cropper ready
  }

  loadImageFailed() {
    // show message
  }

  uploadImage() {
    this.isLoading = true;
    const byteCharacters = atob(this.croppedImage.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const formData = new FormData();
    formData.append('profilePhoto', blob, 'profile.png');

    this.userService.uploadProfilePhoto(formData).subscribe(
      (res: any) => {
        this.user.profilePhoto = res.imageUrl;
        this.imageChangedEvent = null;
        this.isCropperOpen = false;
        this.isLoading = false;
        console.log(
          'Profile photo updated successfully:',
          this.user.profilePhoto
        );
      },
      (err) => {
        this.isLoading = false;
        console.error(err);
      }
    );
  }

  cancelCrop() {
    this.imageChangedEvent = null;
    this.isCropperOpen = false;
  }
}
