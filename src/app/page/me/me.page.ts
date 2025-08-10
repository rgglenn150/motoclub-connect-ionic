import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';

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
    profilePhotoUrl: 'https://placehold.co/100x100/F59E0B/2D3748?text=R',
    stats: {
      rides: 12,
      kmRidden: 1450,
      clubs: 3
    }
  };

  imageChangedEvent: any = null;
  croppedImage: any = '';
  isCropperOpen = false;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.fetchUserData();
  }

  fetchUserData() {
    // TODO: Replace with actual API call to your backend
    // this.http.get('http://localhost:4200/api/user').subscribe(response => {
    //   this.user = response;
    // }, error => {
    //   console.error('Error fetching user data', error);
    // });
  }

  logout() {
    this.http.post('http://localhost:4200/api/auth/logout', {}).subscribe(response => {
      console.log('logout successful');
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }, error => {
      console.error('Logout failed', error);
    });
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

  imageLoaded(image: LoadedImage) {
      // show cropper
  }

  cropperReady() {
      // cropper ready
  }

  loadImageFailed() {
      // show message
  }

  uploadImage() {
    const byteCharacters = atob(this.croppedImage.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const formData = new FormData();
    formData.append('profilePhoto', blob, 'profile.png');

    this.http.post('http://localhost:4200/api/user/profile-photo', formData).subscribe((res: any) => {
      this.user.profilePhotoUrl = res.profilePhotoUrl;
      this.imageChangedEvent = null;
      this.isCropperOpen = false;
    }, (err) => {
      console.error(err);
    });
  }

  cancelCrop() {
    this.imageChangedEvent = null;
    this.isCropperOpen = false;
  }

}
