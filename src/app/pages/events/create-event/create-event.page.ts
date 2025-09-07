import { Component, OnInit } from '@angular/core';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ToastService } from 'src/app/service/utils/toast.service';
import { EventService, Event as ClubEvent, CreateEventData } from 'src/app/service/event.service';

@Component({
  selector: 'app-create-event',
  templateUrl: './create-event.page.html',
  styleUrls: ['./create-event.page.scss'],
})
export class CreateEventPage implements OnInit {
  createEventForm: FormGroup;
  eventImagePreview: string | ArrayBuffer | null = null;
  cropperVisible = false;
  imageChangedEvent: Event | null = null;
  croppedImageBase64: string | null = null;
  private selectedImageFile: File | null = null;
  isLoading = false;
  clubId: string = '';
  
  // Date handling
  minDate = new Date().toISOString();
  minEndDate = new Date().toISOString();
  startDateTime: string = '';
  endDateTime: string = '';


  constructor(
    private formBuilder: FormBuilder,
    private eventService: EventService,
    private toastService: ToastService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Get clubId from route parameters
    this.clubId = this.activatedRoute.snapshot.paramMap.get('clubId') || '';
    
    console.log('CreateEventPage initialized with clubId:', this.clubId);
    
    if (!this.clubId) {
      console.warn('No club ID found in route parameters');
      this.toastService.presentToast('No club selected. Please select a club first.', 'top', 3000);
      this.router.navigate(['/tabs/clubs']);
      return;
    }

    this.createEventForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      eventType: ['ride', Validators.required], // Set default to 'ride' for motorcycle clubs
      location: ['', [Validators.required, Validators.maxLength(200)]], // Direct FormControl
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });

    console.log('Form created successfully:', this.createEventForm);
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
      this.eventImagePreview = this.croppedImageBase64;
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
    this.eventImagePreview = this.croppedImageBase64;
    // Convert base64 to File manually for Angular compatibility
    const arr = this.croppedImageBase64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    this.selectedImageFile = new File([u8arr], 'event-image.png', { type: mime });
    this.cropperVisible = false;
    this.imageChangedEvent = null;
  }

  cancelCrop() {
    this.cropperVisible = false;
    this.imageChangedEvent = null;
    this.croppedImageBase64 = null;
  }

  onStartDateChange(event: any) {
    this.startDateTime = event.detail.value;
    this.createEventForm.patchValue({ startDate: this.startDateTime });
    
    // Validate that start date is in the future
    const startDate = new Date(this.startDateTime);
    const now = new Date();
    
    if (startDate <= now) {
      this.toastService.presentToast('Event start time must be in the future.', 'top', 3000);
      return;
    }
    
    // Update minimum end date to be at least 1 hour after start date
    startDate.setHours(startDate.getHours() + 1);
    this.minEndDate = startDate.toISOString();
    
    // If end date is before new minimum, update it
    if (this.endDateTime && new Date(this.endDateTime) < startDate) {
      this.endDateTime = startDate.toISOString();
      this.createEventForm.patchValue({ endDate: this.endDateTime });
    }
  }

  onEndDateChange(event: any) {
    this.endDateTime = event.detail.value;
    this.createEventForm.patchValue({ endDate: this.endDateTime });
  }


  /**
   * Validates the form and uses the EventService to create a new event.
   * Implements a two-step process: create event first, then upload image if present.
   */
  createEvent() {
    if (this.createEventForm.invalid) {
      this.toastService.presentToast('Please fill out all required fields correctly.', 'top', 3000);
      return;
    }

    if (!this.startDateTime || !this.endDateTime) {
      this.toastService.presentToast('Please select start and end dates for the event.', 'top', 3000);
      return;
    }

    // Validate that dates are in the future
    const startDate = new Date(this.startDateTime);
    const endDate = new Date(this.endDateTime);
    const now = new Date();

    if (startDate <= now) {
      this.toastService.presentToast('Event start time must be in the future.', 'top', 3000);
      return;
    }

    // Validate that end date is after start date
    if (endDate <= startDate) {
      this.toastService.presentToast('End date must be after start date.', 'top', 3000);
      return;
    }

    // Show loading spinner
    this.isLoading = true;

    // Prepare event data according to CreateEventData interface
    const eventData: CreateEventData = {
      name: this.createEventForm.get('name')?.value,
      description: this.createEventForm.get('description')?.value,
      startTime: this.startDateTime,
      endTime: this.endDateTime,
      location: this.createEventForm.get('location')?.value,
      eventType: this.createEventForm.get('eventType')?.value,
      club: this.clubId
    };

    console.log('Submitting Event Data:', eventData);

    // Step 1: Create the event
    this.eventService.createEvent(eventData).subscribe({
      next: (response: ClubEvent) => {
        console.log('Event created successfully:', response);
        const eventId = response._id || response.name;
        
        // Step 2: Upload image if present
        if (this.selectedImageFile && eventId) {
          this.uploadEventImage(eventId, response);
        } else {
          // No image to upload, finish successfully
          this.handleEventCreationSuccess();
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error creating event:', error);
        this.handleEventCreationError(error, 'create');
      }
    });
  }

  /**
   * Uploads the event image after successful event creation
   */
  private uploadEventImage(eventId: string, eventResponse: ClubEvent) {
    if (!this.selectedImageFile) {
      this.handleEventCreationSuccess();
      return;
    }

    this.eventService.uploadEventImage(eventId, this.selectedImageFile).subscribe({
      next: (updatedEvent: ClubEvent) => {
        console.log('Event image uploaded successfully:', updatedEvent);
        this.handleEventCreationSuccess();
      },
      error: (error) => {
        console.error('Error uploading event image:', error);
        // Event was created but image upload failed
        this.isLoading = false;
        this.toastService.presentToast('Event created successfully, but image upload failed. You can add an image later.', 'top', 4000);
        this.navigateToClubHome();
      }
    });
  }

  /**
   * Handles successful event creation
   */
  private async handleEventCreationSuccess() {
    this.isLoading = false;
    
    // Show success message with enhanced UX
    const toast = await this.toastController.create({
      message: '🎉 Event created successfully!',
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
    
    this.navigateToClubHome();
  }

  /**
   * Handles errors during event creation or image upload
   */
  private handleEventCreationError(error: any, step: 'create' | 'upload') {
    let errorMessage = 'An unexpected error occurred. Please try again.';
    
    if (error.error) {
      if (error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error.error) {
        errorMessage = error.error.error;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Provide specific error messages based on common scenarios
    if (error.status === 400) {
      errorMessage = 'Invalid event data. Please check all fields and try again.';
    } else if (error.status === 401) {
      errorMessage = 'You are not authorized to create events. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to create events for this club.';
    } else if (error.status === 404) {
      errorMessage = 'Club not found. Please select a valid club.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (!navigator.onLine) {
      errorMessage = 'No internet connection. Please check your connection and try again.';
    }

    this.toastService.presentToast(errorMessage, 'top', 4000);
  }


  /**
   * Navigates back to the club home page with the events tab selected
   */
  private navigateToClubHome() {
    this.router.navigate(['/clubs', this.clubId], { 
      queryParams: { tab: 'events' },
      replaceUrl: true 
    });
  }
}