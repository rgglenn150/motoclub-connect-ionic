import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { ToastController } from '@ionic/angular';

import { UserService, UserProfile, UpdateProfileData, UpdateUsernameData, UpdateEmailData } from '../../../service/user.service';
import { UserStateService } from '../../../service/user-state.service';
import { ToastService } from '../../../service/utils/toast.service';

interface PendingChange {
  field: string;
  from: string;
  to: string;
}

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
})
export class EditProfilePage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput: ElementRef;

  private destroy$ = new Subject<void>();
  private usernameCheck$ = new Subject<string>();
  private emailCheck$ = new Subject<string>();

  editProfileForm: FormGroup;
  userProfile: UserProfile | null = null;
  originalProfile: UserProfile | null = null;
  
  // Image cropping
  imageChangedEvent: any = null;
  croppedImage: any = '';
  isCropperOpen = false;
  
  // Loading states
  isLoading = false;
  usernameStatus: 'idle' | 'checking' | 'available' | 'unavailable' = 'idle';
  emailStatus: 'idle' | 'checking' | 'available' | 'unavailable' = 'idle';
  
  // Password confirmation
  showPasswordConfirmation = false;
  confirmationPassword = '';
  pendingChanges: PendingChange[] = [];
  
  // Change tracking
  hasChanges = false;
  hasSensitiveChanges = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private userStateService: UserStateService,
    private toastService: ToastService,
    private toastController: ToastController,
    private router: Router
  ) {
    this.initializeForm();
    this.setupAvailabilityCheckers();
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    this.editProfileForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]]
    });

    // Watch for form changes
    this.editProfileForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateChangeFlags());
  }

  private setupAvailabilityCheckers() {
    // Setup username availability checking with debounce
    this.usernameCheck$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(username => this.checkUsernameAvailability(username));

    // Setup email availability checking with debounce
    this.emailCheck$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(email => this.checkEmailAvailability(email));
  }

  private loadUserProfile() {
    this.isLoading = true;
    
    this.userService.getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          this.userProfile = profile;
          this.originalProfile = { ...profile };
          this.populateForm(profile);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user profile:', error);
          this.isLoading = false;
          this.toastService.presentToast('Failed to load profile data', 'top', 3000);
          this.router.navigate(['/tabs/me']);
        }
      });
  }

  private populateForm(profile: UserProfile) {
    this.editProfileForm.patchValue({
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username,
      email: profile.email
    }, { emitEvent: false });

    // Reset change flags after populating
    this.updateChangeFlags();
  }

  private updateChangeFlags() {
    if (!this.originalProfile) return;

    const currentValues = this.editProfileForm.value;
    const original = this.originalProfile;

    // Check for basic info changes
    const hasBasicChanges = 
      currentValues.firstName !== original.firstName ||
      currentValues.lastName !== original.lastName;

    // Check for sensitive changes
    const hasSensitiveChanges = 
      currentValues.username !== original.username ||
      currentValues.email !== original.email;

    this.hasChanges = hasBasicChanges || hasSensitiveChanges;
    this.hasSensitiveChanges = hasSensitiveChanges;
  }

  getInitials(): string {
    if (!this.userProfile) return 'U';
    const first = this.userProfile.firstName?.[0] || '';
    const last = this.userProfile.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  }

  // Profile Photo Methods
  onProfilePhotoClick() {
    this.fileInput.nativeElement.click();
  }

  fileChangeEvent(event: any): void {
    this.imageChangedEvent = event;
    this.isCropperOpen = true;
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64;
  }

  imageLoaded() {
    // Image loaded successfully
  }

  cropperReady() {
    // Cropper is ready
  }

  loadImageFailed() {
    this.toastService.presentToast('Failed to load image for cropping', 'top', 3000);
  }

  applyCrop() {
    if (!this.croppedImage) {
      this.toastService.presentToast('Please adjust the crop before applying', 'top', 2000);
      return;
    }

    this.uploadProfilePhoto();
  }

  cancelCrop() {
    this.imageChangedEvent = null;
    this.isCropperOpen = false;
    this.croppedImage = '';
  }

  private uploadProfilePhoto() {
    if (!this.croppedImage) return;

    this.isLoading = true;
    
    // Convert base64 to blob
    const byteCharacters = atob(this.croppedImage.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const formData = new FormData();
    formData.append('profilePhoto', blob, 'profile.png');

    this.userService.uploadProfilePhoto(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (this.userProfile) {
            this.userProfile.profilePhoto = response.imageUrl;
          }
          // Update global user state
          this.userStateService.updateUserProperty('profilePhoto', response.imageUrl);
          this.cancelCrop();
          this.isLoading = false;
          this.toastService.presentToast('Profile photo updated successfully', 'top', 2000);
        },
        error: (error) => {
          console.error('Error uploading profile photo:', error);
          this.isLoading = false;
          this.toastService.presentToast('Failed to upload profile photo', 'top', 3000);
        }
      });
  }

  // Basic Field Changes (Auto-save)
  onBasicFieldChange(field: 'firstName' | 'lastName') {
    if (this.editProfileForm.get(field)?.invalid) return;
    
    const newValue = this.editProfileForm.get(field)?.value?.trim();
    const originalValue = this.originalProfile?.[field];
    
    if (newValue && newValue !== originalValue) {
      this.saveBasicField(field, newValue);
    }
  }

  private saveBasicField(field: 'firstName' | 'lastName', value: string) {
    const updateData: UpdateProfileData = { [field]: value };
    
    this.userService.updateProfile(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProfile) => {
          if (this.originalProfile) {
            this.originalProfile[field] = value;
          }
          if (this.userProfile) {
            this.userProfile[field] = value;
          }
          
          // Update global state
          this.userStateService.updateUserProperty(field, value);
          this.updateChangeFlags();
          
          this.showSuccessToast(`${field === 'firstName' ? 'First' : 'Last'} name updated`);
        },
        error: (error) => {
          console.error(`Error updating ${field}:`, error);
          this.toastService.presentToast(`Failed to update ${field === 'firstName' ? 'first' : 'last'} name`, 'top', 3000);
          
          // Revert form value
          this.editProfileForm.get(field)?.setValue(this.originalProfile?.[field] || '');
        }
      });
  }

  // Username/Email Availability Checking
  onUsernameInput() {
    const username = this.editProfileForm.get('username')?.value?.trim();
    if (username && username !== this.originalProfile?.username && username.length >= 3) {
      this.usernameStatus = 'checking';
      this.usernameCheck$.next(username);
    } else {
      this.usernameStatus = 'idle';
    }
  }

  onUsernameBlur() {
    // Additional validation on blur if needed
  }

  private checkUsernameAvailability(username: string) {
    this.userService.checkUsernameAvailability(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.usernameStatus = result.available ? 'available' : 'unavailable';
        },
        error: (error) => {
          console.error('Error checking username availability:', error);
          this.usernameStatus = 'idle';
        }
      });
  }

  onEmailInput() {
    const email = this.editProfileForm.get('email')?.value?.trim();
    if (email && email !== this.originalProfile?.email && this.editProfileForm.get('email')?.valid) {
      this.emailStatus = 'checking';
      this.emailCheck$.next(email);
    } else {
      this.emailStatus = 'idle';
    }
  }

  onEmailBlur() {
    // Additional validation on blur if needed
  }

  private checkEmailAvailability(email: string) {
    this.userService.checkEmailAvailability(email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.emailStatus = result.available ? 'available' : 'unavailable';
        },
        error: (error) => {
          console.error('Error checking email availability:', error);
          this.emailStatus = 'idle';
        }
      });
  }

  // Password Confirmation Modal
  showPasswordModal() {
    if (!this.hasSensitiveChanges || !this.originalProfile) return;

    this.pendingChanges = [];
    const currentValues = this.editProfileForm.value;
    
    if (currentValues.username !== this.originalProfile.username) {
      this.pendingChanges.push({
        field: 'Username',
        from: this.originalProfile.username,
        to: currentValues.username
      });
    }
    
    if (currentValues.email !== this.originalProfile.email) {
      this.pendingChanges.push({
        field: 'Email',
        from: this.originalProfile.email,
        to: currentValues.email
      });
    }

    this.confirmationPassword = '';
    this.showPasswordConfirmation = true;
  }

  cancelPasswordModal() {
    this.showPasswordConfirmation = false;
    this.confirmationPassword = '';
    this.pendingChanges = [];
  }

  async confirmSensitiveChanges() {
    if (!this.confirmationPassword) {
      this.toastService.presentToast('Please enter your password', 'top', 2000);
      return;
    }

    this.isLoading = true;
    const currentValues = this.editProfileForm.value;
    const updates: Promise<any>[] = [];

    // Update username if changed
    if (currentValues.username !== this.originalProfile?.username) {
      if (this.usernameStatus !== 'available') {
        this.isLoading = false;
        this.toastService.presentToast('Username is not available', 'top', 3000);
        return;
      }

      const usernameData: UpdateUsernameData = {
        username: currentValues.username,
        password: this.confirmationPassword
      };
      updates.push(this.userService.updateUsername(usernameData).toPromise());
    }

    // Update email if changed
    if (currentValues.email !== this.originalProfile?.email) {
      if (this.emailStatus !== 'available') {
        this.isLoading = false;
        this.toastService.presentToast('Email is not available', 'top', 3000);
        return;
      }

      const emailData: UpdateEmailData = {
        email: currentValues.email,
        password: this.confirmationPassword
      };
      updates.push(this.userService.updateEmail(emailData).toPromise());
    }

    try {
      const results = await Promise.all(updates);
      
      // Update local state with successful changes
      if (results.length > 0) {
        const latestProfile = results[results.length - 1];
        this.userProfile = latestProfile;
        this.originalProfile = { ...latestProfile };
        
        // Update global state
        this.userStateService.updateUser(latestProfile);
      }

      this.updateChangeFlags();
      this.showPasswordConfirmation = false;
      this.confirmationPassword = '';
      this.isLoading = false;
      
      this.showSuccessToast('Account settings updated successfully');
      
    } catch (error: any) {
      console.error('Error updating sensitive fields:', error);
      this.isLoading = false;
      
      let errorMessage = 'Failed to update account settings';
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 401) {
        errorMessage = 'Incorrect password';
      }
      
      this.toastService.presentToast(errorMessage, 'top', 3000);
    }
  }

  // Save method (for header button)
  saveChanges() {
    if (this.hasSensitiveChanges) {
      this.showPasswordModal();
    } else {
      // Only basic changes, save them
      const updates: Promise<any>[] = [];
      const currentValues = this.editProfileForm.value;
      
      const basicData: UpdateProfileData = {};
      let hasBasicUpdates = false;
      
      if (currentValues.firstName !== this.originalProfile?.firstName) {
        basicData.firstName = currentValues.firstName;
        hasBasicUpdates = true;
      }
      
      if (currentValues.lastName !== this.originalProfile?.lastName) {
        basicData.lastName = currentValues.lastName;
        hasBasicUpdates = true;
      }
      
      if (hasBasicUpdates) {
        this.isLoading = true;
        this.userService.updateProfile(basicData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedProfile) => {
              this.userProfile = updatedProfile;
              this.originalProfile = { ...updatedProfile };
              this.userStateService.updateUser(updatedProfile);
              this.updateChangeFlags();
              this.isLoading = false;
              this.showSuccessToast('Profile updated successfully');
            },
            error: (error) => {
              console.error('Error updating profile:', error);
              this.isLoading = false;
              this.toastService.presentToast('Failed to update profile', 'top', 3000);
            }
          });
      }
    }
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
}