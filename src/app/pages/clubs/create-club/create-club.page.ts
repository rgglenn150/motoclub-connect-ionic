import { Component, OnInit } from '@angular/core';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/service/utils/toast.service';
import { ClubService, Club } from 'src/app/service/club.service'; // Import the service and interface
import { LocationData } from 'src/app/components/mapbox-autocomplete/mapbox-autocomplete.component';

@Component({
  selector: 'app-create-club',
  templateUrl: './create-club.page.html',
  styleUrls: ['./create-club.page.scss'],
})
export class CreateClubPage implements OnInit {
  createClubForm: FormGroup;
  clubImagePreview: string | ArrayBuffer | null = null;
  cropperVisible = false;
  imageChangedEvent: Event | null = null;
  croppedImageBase64: string | null = null;
  private selectedLogoFile: File | null = null;
  isLoading = false;
  selectedLocation: LocationData | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private clubService: ClubService, // Inject ClubService
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.createClubForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      location: [''],
      isPrivate: [true, Validators.required],
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageChangedEvent = event;
      this.cropperVisible = true;
    }
  }

  onImageCropped(event: ImageCroppedEvent) {
    this.croppedImageBase64 = event.base64 || null;
    // Reflect cropped image in preview immediately; remains after Apply
    if (this.croppedImageBase64) {
      this.clubImagePreview = this.croppedImageBase64;
    }
  }

  onCropperReady() {}
  onCropperLoadImageFailed() {
    this.toastService.presentToast('Failed to load image for cropping.', 'top', 3000);
  }

  applyCrop() {
    if (!this.croppedImageBase64) {
      this.toastService.presentToast('Please adjust the crop before applying.', 'top', 2000);
      return;
    }
    this.clubImagePreview = this.croppedImageBase64;
    // Convert base64 to File manually for Angular 14 compatible version
    const arr = this.croppedImageBase64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    this.selectedLogoFile = new File([u8arr], 'club-logo.png', { type: mime });
    this.cropperVisible = false;
    this.imageChangedEvent = null;
  }

  cancelCrop() {
    this.cropperVisible = false;
    this.imageChangedEvent = null;
    this.croppedImageBase64 = null;
  }

  onLocationSelected(locationData: LocationData) {
    this.selectedLocation = locationData;
    console.log('Location selected:', locationData);
  }

  /**
   * Validates the form and uses the ClubService to create a new club.
   */
  registerClub() {
    if (this.createClubForm.invalid) {
      this.toastService.presentToast('Please fill out all required fields correctly.', 'top', 3000);
      return;
    }

    // Show loading spinner
    this.isLoading = true;

    // Use the Club interface for type safety
    const clubData: Club = this.createClubForm.value;

    // Add geolocation data if available from Mapbox selection
    if (this.selectedLocation) {
      clubData.geolocation = {
        latitude: this.selectedLocation.latitude,
        longitude: this.selectedLocation.longitude,
        placeName: this.selectedLocation.placeName
      };
    }

    console.log('Submitting Club Data:', clubData);

    // Call the service instead of http directly
    this.clubService.createClub(clubData).subscribe({
      next: (response) => {
        // eslint-disable-next-line no-underscore-dangle
        const clubId = response.id || response._id;
        if (this.selectedLogoFile && clubId) {
          this.clubService.uploadClubLogo(clubId, this.selectedLogoFile).subscribe({
            next: () => {
              this.isLoading = false; // Hide loading spinner
              this.toastService.presentToast('Club created and logo uploaded!', 'top', 2000);
              this.router.navigate(['/home']);
            },
            error: (uploadErr) => {
              this.isLoading = false; // Hide loading spinner
              console.error('Error uploading logo:', uploadErr);
              this.toastService.presentToast('Club created, but logo upload failed.', 'top', 3000);
              this.router.navigate(['/home']);
            },
          });
        } else {
          this.isLoading = false; // Hide loading spinner
          this.toastService.presentToast('Club created successfully!', 'top', 2000);
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        this.isLoading = false; // Hide loading spinner
        console.error('Error creating club:', error);
        this.toastService.presentToast('Error creating club. Please try again.', 'top', 3000);
      }
    });
  }
}
