import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, forwardRef } from '@angular/core';
import { FormControl, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonPopover, LoadingController } from '@ionic/angular';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { PlacesService, PlaceResult } from '../../service/places.service';
import { ToastService } from '../../service/utils/toast.service';

@Component({
  selector: 'app-places-autocomplete',
  templateUrl: './places-autocomplete.component.html',
  styleUrls: ['./places-autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PlacesAutocompleteComponent),
      multi: true
    }
  ]
})
export class PlacesAutocompleteComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder: string = 'Enter location';
  @Input() icon: string = 'location-outline';
  @Input() formControl: FormControl = new FormControl();
  @Input() showCurrentLocationButton: boolean = true;
  @Output() placeSelected = new EventEmitter<PlaceResult>();
  @Output() locationCleared = new EventEmitter<void>();

  @ViewChild('popover', { static: false }) popover!: IonPopover;
  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef;

  searchControl = new FormControl('');
  predictions: PlaceResult[] = [];
  isPopoverOpen = false;
  isSearching = false;
  isApiAvailable = false;
  private destroy$ = new Subject<void>();

  constructor(
    private placesService: PlacesService,
    private toastService: ToastService,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    // Check if Google Maps API is available
    this.isApiAvailable = this.placesService.isApiAvailable();

    if (!this.isApiAvailable) {
      console.warn('Google Maps Places API not available. Using manual input only.');
      return;
    }

    // Set initial value from form control
    if (this.formControl.value) {
      this.searchControl.setValue(this.formControl.value);
    }

    // Subscribe to search input changes
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) {
          this.predictions = [];
          this.isPopoverOpen = false;
          return of([]);
        }

        this.isSearching = true;
        return this.placesService.getPlacePredictions(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe(predictions => {
      this.predictions = predictions;
      this.isSearching = false;
      this.isPopoverOpen = predictions.length > 0;
    });

    // Update form control when search control changes (for manual input)
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (typeof value === 'string') {
        this.formControl.setValue(value);
        this.onChange(value);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onPlaceSelected(place: PlaceResult) {
    try {
      this.isPopoverOpen = false;
      this.searchControl.setValue(place.description);
      this.formControl.setValue(place.description);
      this.onChange(place.description);
      this.onTouched();
      
      // Get detailed place information if needed
      if (place.place_id) {
        const details = await this.placesService.getPlaceDetails(place.place_id);
        if (details) {
          this.placeSelected.emit(details);
        } else {
          this.placeSelected.emit(place);
        }
      } else {
        this.placeSelected.emit(place);
      }
    } catch (error) {
      console.error('Error selecting place:', error);
      this.toastService.presentToast('Error selecting location. Please try again.', 'top', 3000);
    }
  }

  async useCurrentLocation() {
    const loading = await this.loadingController.create({
      message: 'Getting your location...',
      duration: 10000
    });
    await loading.present();

    try {
      const location = await this.placesService.getCurrentLocation();
      if (location) {
        // Try to get address from coordinates
        if (this.isApiAvailable) {
          const address = await this.placesService.reverseGeocode(location.lat, location.lng);
          if (address) {
            this.searchControl.setValue(address);
            this.formControl.setValue(address);
            const place: PlaceResult = {
              place_id: '',
              description: address,
              formatted_address: address,
              geometry: {
                location: location
              }
            };
            this.placeSelected.emit(place);
          } else {
            // Fallback to coordinates
            const coordString = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
            this.searchControl.setValue(coordString);
            this.formControl.setValue(coordString);
            const place: PlaceResult = {
              place_id: '',
              description: coordString,
              geometry: {
                location: location
              }
            };
            this.placeSelected.emit(place);
          }
        } else {
          // Just use coordinates
          const coordString = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
          this.searchControl.setValue(coordString);
          this.formControl.setValue(coordString);
          const place: PlaceResult = {
            place_id: '',
            description: coordString,
            geometry: {
              location: location
            }
          };
          this.placeSelected.emit(place);
        }
        this.toastService.presentToast('Current location detected!', 'top', 2000);
      } else {
        this.toastService.presentToast('Unable to get your current location. Please enter manually.', 'top', 3000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      this.toastService.presentToast('Error getting location. Please try again or enter manually.', 'top', 3000);
    } finally {
      loading.dismiss();
    }
  }

  clearLocation() {
    this.searchControl.setValue('');
    this.formControl.setValue('');
    this.onChange('');
    this.onTouched();
    this.predictions = [];
    this.isPopoverOpen = false;
    this.locationCleared.emit();
  }

  onInputFocus() {
    if (this.predictions.length > 0) {
      this.isPopoverOpen = true;
    }
  }

  onPopoverDidDismiss() {
    this.isPopoverOpen = false;
  }

  trackByPlaceId(index: number, place: PlaceResult): string {
    return place.place_id || index.toString();
  }

  // ControlValueAccessor implementation
  private onTouched = () => {};
  private onChange = (value: any) => {};

  writeValue(value: any): void {
    if (value) {
      this.searchControl.setValue(value, { emitEvent: false });
    } else {
      this.searchControl.setValue('', { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.searchControl.disable();
    } else {
      this.searchControl.enable();
    }
  }
}