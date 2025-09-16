import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

import { ClubService, Club, ClubUpdateRequest } from '../../../service/club.service';
import { AuthService } from '../../../service/auth.service';
import { PlacesService } from '../../../service/places.service';
import { ToastService } from '../../../service/utils/toast.service';
import { LocationData } from '../../../components/mapbox-autocomplete/mapbox-autocomplete.component';

@Component({
  selector: 'app-edit-club',
  templateUrl: './edit-club.page.html',
  styleUrls: ['./edit-club.page.scss'],
})
export class EditClubPage implements OnInit, OnDestroy {
  @ViewChild('logoInput') logoInput: ElementRef;

  private destroy$ = new Subject<void>();
  private clubNameCheck$ = new Subject<string>();

  club: Club | null = null;
  originalClub: Club | null = null;
  editClubForm: FormGroup;
  clubId: string;

  // Loading states
  isLoading: boolean = false;
  isSaving: boolean = false;
  hasUnsavedChanges: boolean = false;
  isGettingLocation: boolean = false;

  // Image handling
  selectedLogo: File | null = null;
  showCropper: boolean = false;
  logoImageUrl: string = '';
  imageChangedEvent: any = null;
  croppedImage: any = '';
  uploadProgress: number = 0;

  // Validation states
  clubNameStatus: 'available' | 'unavailable' | 'checking' | null = null;
  locationHint: string = '';

  // Permission checking
  isAdmin: boolean = false;
  currentUser: any = null;

  // Location handling
  selectedLocation: LocationData | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private clubService: ClubService,
    private authService: AuthService,
    private placesService: PlacesService,
    private toastService: ToastService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    this.initializeForm();
    this.setupClubNameChecker();
  }

  ngOnInit() {
    // Get club ID from route parameters
    this.clubId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.clubId) {
      this.router.navigate(['/tabs/clubs']);
      return;
    }

    this.currentUser = this.authService.getLoggedInUser();
  }

  ionViewWillEnter() {
    if (this.clubId) {
      this.loadClubData();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    this.editClubForm = this.formBuilder.group({
      clubName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(500)
      ]],
      location: ['', [Validators.maxLength(100)]],
      isPrivate: [false]
    });

    // Watch for form changes
    this.editClubForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateChangeFlags());
  }

  private setupClubNameChecker() {
    // Setup club name availability checking with debounce
    this.clubNameCheck$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(clubName => this.checkClubNameAvailability(clubName));
  }

  private async loadClubData() {
    this.isLoading = true;

    const loading = await this.loadingController.create({
      message: 'Loading club details...'
    });
    await loading.present();

    this.clubService.getClubDetails(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.club = response.club || response;
          this.originalClub = { ...this.club };
          this.populateForm(this.club);
          this.checkAdminPermission();
          this.isLoading = false;
          loading.dismiss();
        },
        error: (error) => {
          console.error('Error loading club data:', error);
          this.isLoading = false;
          loading.dismiss();
          this.toastService.presentToast('Failed to load club data', 'top', 3000);
          this.router.navigate(['/tabs/clubs']);
        }
      });
  }

  private populateForm(club: Club) {
    this.editClubForm.patchValue({
      clubName: club.clubName,
      description: club.description,
      location: club.location || '',
      isPrivate: club.isPrivate
    }, { emitEvent: false });

    // Set logo URL for display
    this.logoImageUrl = club.logoUrl || '';

    // Reset change flags after populating
    this.updateChangeFlags();
  }

  private checkAdminPermission() {
    if (!this.club || !this.currentUser) {
      this.isAdmin = false;
      return;
    }

    // Check if current user is admin of this club
    this.clubService.getMembershipStatus(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.isAdmin = status.role === 'admin' || status.isAdmin;
          if (!this.isAdmin) {
            this.toastService.presentToast('You do not have permission to edit this club', 'top', 3000);
            this.router.navigate(['/clubs', this.clubId]);
          }
        },
        error: (error) => {
          console.error('Error checking admin permission:', error);
          this.isAdmin = false;
          this.toastService.presentToast('Unable to verify permissions', 'top', 3000);
          this.router.navigate(['/tabs/clubs']);
        }
      });
  }

  private updateChangeFlags() {
    if (!this.originalClub) {
      this.hasUnsavedChanges = false;
      return;
    }

    const currentValues = this.editClubForm.value;
    const original = this.originalClub;

    // Ensure we're comparing strings properly (trim and handle null/undefined)
    const normalizeString = (str: any): string => (str || '').toString().trim();

    // Check for changes in form values
    const hasFormChanges =
      normalizeString(currentValues.clubName) !== normalizeString(original.clubName) ||
      normalizeString(currentValues.description) !== normalizeString(original.description) ||
      normalizeString(currentValues.location) !== normalizeString(original.location) ||
      Boolean(currentValues.isPrivate) !== Boolean(original.isPrivate);

    // Check for logo changes
    const hasLogoChanges = this.selectedLogo !== null;

    this.hasUnsavedChanges = hasFormChanges || hasLogoChanges;
  }

  // Club name validation methods
  onClubNameInput() {
    const clubName = this.editClubForm.get('clubName')?.value?.trim();
    if (clubName && clubName !== this.originalClub?.clubName && clubName.length >= 2) {
      this.clubNameStatus = 'checking';
      this.clubNameCheck$.next(clubName);
    } else {
      this.clubNameStatus = null;
    }
  }

  onClubNameBlur() {
    // Additional validation on blur if needed
  }

  private checkClubNameAvailability(clubName: string) {
    this.clubService.checkClubNameAvailability(clubName, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.clubNameStatus = result.available ? 'available' : 'unavailable';
        },
        error: (error) => {
          console.error('Error checking club name availability:', error);
          this.clubNameStatus = null;
        }
      });
  }

  // Logo handling methods
  onSelectLogo() {
    this.logoInput.nativeElement.click();
  }

  onLogoSelected(event: any): void {
    this.imageChangedEvent = event;
    this.showCropper = true;
  }

  onCropComplete(event: ImageCroppedEvent) {
    this.croppedImage = event.base64;
  }

  applyCrop() {
    if (!this.croppedImage) {
      this.toastService.presentToast('Please adjust the crop before applying', 'top', 2000);
      return;
    }

    // Convert base64 to File
    const byteCharacters = atob(this.croppedImage.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    this.selectedLogo = new Blob([byteArray], { type: 'image/png' }) as File;

    // Update preview
    this.logoImageUrl = this.croppedImage;
    this.updateChangeFlags();

    this.cancelCrop();
  }

  cancelCrop() {
    this.imageChangedEvent = null;
    this.showCropper = false;
    this.croppedImage = '';
  }

  // Geolocation methods
  async getCurrentLocation() {
    this.isGettingLocation = true;
    this.locationHint = 'Getting your location...';

    try {
      const coordinates = await this.placesService.getCurrentLocation();
      if (coordinates) {
        // If reverse geocoding is available, get address
        const address = await this.placesService.reverseGeocode(coordinates.lat, coordinates.lng);
        if (address) {
          this.editClubForm.patchValue({ location: address });
          this.locationHint = 'Location updated successfully';
        } else {
          this.editClubForm.patchValue({
            location: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
          });
          this.locationHint = 'Coordinates updated';
        }
      } else {
        this.locationHint = 'Unable to get current location';
        this.toastService.presentToast('Unable to get current location', 'top', 3000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      this.locationHint = 'Error accessing location services';
      this.toastService.presentToast('Error accessing location services', 'top', 3000);
    } finally {
      this.isGettingLocation = false;
      // Clear hint after 3 seconds
      setTimeout(() => {
        this.locationHint = '';
      }, 3000);
    }
  }

  /**
   * Handles the location selection from Mapbox autocomplete
   */
  onLocationSelected(locationData: LocationData) {
    this.selectedLocation = locationData;
    console.log('Location selected:', locationData);

    // Update geolocation in the club object for future updates
    if (this.club) {
      this.club.geolocation = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        placeName: locationData.placeName
      };
    }

    // Update change flags when location is selected
    this.updateChangeFlags();
  }

  // Save methods
  async onSave() {
    if (!this.editClubForm.valid) {
      this.toastService.presentToast('Please fix all form errors before saving', 'top', 3000);
      return;
    }

    if (!this.hasUnsavedChanges) {
      this.toastService.presentToast('No changes to save', 'top', 2000);
      return;
    }

    // Check club name availability if changed
    if (this.clubNameStatus === 'unavailable') {
      this.toastService.presentToast('Club name is not available', 'top', 3000);
      return;
    }

    this.isSaving = true;

    const loading = await this.loadingController.create({
      message: 'Saving changes...'
    });
    await loading.present();

    try {
      const formValues = this.editClubForm.value;
      const updateData: ClubUpdateRequest = {};

      // Only include changed fields
      if (formValues.clubName !== this.originalClub?.clubName) {
        updateData.clubName = formValues.clubName.trim();
      }
      if (formValues.description !== this.originalClub?.description) {
        updateData.description = formValues.description.trim();
      }
      if (formValues.location !== (this.originalClub?.location || '')) {
        updateData.location = formValues.location.trim();

        // Add geolocation data if available from Mapbox selection
        if (this.selectedLocation) {
          updateData.geolocation = {
            latitude: this.selectedLocation.latitude,
            longitude: this.selectedLocation.longitude,
            placeName: this.selectedLocation.placeName
          };
        }
      }
      if (formValues.isPrivate !== this.originalClub?.isPrivate) {
        updateData.isPrivate = formValues.isPrivate;
      }

      let updateObservable;

      if (this.selectedLogo) {
        // Update with logo
        updateObservable = this.clubService.updateClubWithLogo(this.clubId, updateData, this.selectedLogo);
      } else {
        // Update without logo
        updateObservable = this.clubService.updateClub(this.clubId, updateData);
      }

      updateObservable
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedClub) => {
            console.log('Save response - updatedClub:', updatedClub);

            // Validate the response has the required fields
            if (!updatedClub || !updatedClub.clubName || !updatedClub.description) {
              console.error('Invalid club data received from server:', updatedClub);
              // Don't update form if data is invalid, just reset flags
              this.selectedLogo = null;
              this.selectedLocation = null;
              this.hasUnsavedChanges = false;
            } else {
              // Update club data and form only if valid data received
              this.club = updatedClub;
              this.originalClub = { ...updatedClub };
              this.selectedLogo = null;
              this.selectedLocation = null;
              this.logoImageUrl = updatedClub.logoUrl || '';

              // Reset form with updated club data to ensure sync
              this.populateForm(updatedClub);

              // Explicitly reset change flags after form population
              this.hasUnsavedChanges = false;
            }

            this.isSaving = false;
            loading.dismiss();
            this.showSuccessToast('Club updated successfully');
          },
          error: (error) => {
            console.error('Error updating club:', error);
            this.isSaving = false;
            loading.dismiss();

            let errorMessage = 'Failed to update club';
            if (error.error?.message) {
              errorMessage = error.error.message;
            }
            this.toastService.presentToast(errorMessage, 'top', 3000);
          }
        });

    } catch (error) {
      console.error('Error preparing club update:', error);
      this.isSaving = false;
      loading.dismiss();
      this.toastService.presentToast('Error preparing update', 'top', 3000);
    }
  }

  // Navigation methods
  async onBack() {
    if (this.hasUnsavedChanges) {
      const alert = await this.alertController.create({
        header: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to leave?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Discard Changes',
            handler: () => {
              this.router.navigate(['/clubs', this.clubId]);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.router.navigate(['/clubs', this.clubId]);
    }
  }

  async onDiscard() {
    if (!this.hasUnsavedChanges) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Discard Changes',
      message: 'Are you sure you want to discard all changes?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Discard',
          handler: () => {
            // Reset form to original values
            if (this.originalClub) {
              this.populateForm(this.originalClub);
            }
            this.selectedLogo = null;
            this.logoImageUrl = this.originalClub?.logoUrl || '';
            this.updateChangeFlags();
            this.toastService.presentToast('Changes discarded', 'top', 2000);
          }
        }
      ]
    });
    await alert.present();
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  // Getter methods for template
  getClubLogoUrl(): string {
    return this.logoImageUrl || '/assets/images/default-club-logo.png';
  }

  isFormValid(): boolean {
    return this.editClubForm.valid && this.clubNameStatus !== 'unavailable';
  }

  canSave(): boolean {
    return this.isFormValid() && this.hasUnsavedChanges && !this.isSaving && this.isAdmin;
  }

  // Missing methods for template
  getClubInitials(): string {
    if (!this.club?.clubName) {
      return 'MC';
    }
    const words = this.club.clubName.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return this.club.clubName.substring(0, 2).toUpperCase();
  }

  fileChangeEvent(event: any): void {
    this.onLogoSelected(event);
  }

  imageCropped(event: ImageCroppedEvent): void {
    this.onCropComplete(event);
  }

  imageLoaded(): void {
    // Handle image loaded event - can be used for loading states
    console.log('Image loaded successfully');
  }

  cropperReady(): void {
    // Handle cropper ready event - can be used for UI states
    console.log('Cropper is ready');
  }

  loadImageFailed(): void {
    // Handle image load failure
    console.error('Failed to load image');
    this.toastService.presentToast('Failed to load image. Please try again.', 'top', 3000);
    this.cancelCrop();
  }

  getDescriptionCharCount(): number {
    const description = this.editClubForm.get('description')?.value || '';
    return description.length;
  }

  onLocationInput(): void {
    // Handle location input changes - can be used for search suggestions
    const location = this.editClubForm.get('location')?.value;
    if (location && location.length > 2) {
      this.locationHint = 'Type to search for locations';
    } else {
      this.locationHint = '';
    }
  }

  onDescriptionInput(): void {
    // Handle description input changes - already handled by form value changes
    // Can be used for additional validation or formatting
  }

  onPrivacyToggle(event: any): void {
    // Handle privacy toggle changes - already handled by form control
    const isPrivate = event.detail.checked;
    console.log('Privacy setting changed:', isPrivate);
  }
}
