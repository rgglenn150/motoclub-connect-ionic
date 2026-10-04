import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// Define the structure for location data
export interface LocationData {
  placeName: string;
  latitude: number;
  longitude: number;
}

// Mapbox geocoding response interface
interface MapboxGeocodeResponse {
  features: Array<{
    place_name: string;
    center: [number, number]; // [longitude, latitude]
    geometry: {
      coordinates: [number, number];
    };
  }>;
}

@Component({
  selector: 'app-mapbox-autocomplete',
  template: `
    <ion-input
      [formControl]="searchControl"
      [placeholder]="placeholder"
      type="text"
      (ionFocus)="onFocus()"
      (ionBlur)="onBlur()"
      (ionInput)="resetJustSelectedFlag()"
    ></ion-input>
    
    <div *ngIf="isOpen && suggestions.length > 0" class="suggestions-dropdown">
      <ion-list>
        <ion-item 
          *ngFor="let suggestion of suggestions; trackBy: trackBySuggestion"
          button
          (click)="selectSuggestion(suggestion)"
          class="suggestion-item"
        >
          <ion-icon name="location-outline" slot="start"></ion-icon>
          <ion-label>
            <h3>{{ suggestion.place_name }}</h3>
          </ion-label>
        </ion-item>
      </ion-list>
    </div>
  `,
  styleUrls: ['./mapbox-autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapboxAutocompleteComponent),
      multi: true
    }
  ]
})
export class MapboxAutocompleteComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder: string = 'Search for a location';
  @Output() locationSelected = new EventEmitter<LocationData>();

  searchControl = new FormControl('');
  suggestions: Array<{place_name: string, center: [number, number]}> = [];
  isOpen = false;
  private justSelected = false; // Flag to prevent searches after selection
  
  private destroy$ = new Subject<void>();
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        // Skip search if we just selected a location or query is too short
        if (this.justSelected || !query || query.length < 2) {
          if (this.justSelected) {
            // Reset the flag after skipping the search
            this.justSelected = false;
          }
          this.suggestions = [];
          this.isOpen = false;
          return of([]);
        }
        return this.searchPlaces(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe(suggestions => {
      this.suggestions = suggestions;
      this.isOpen = suggestions.length > 0 && !this.justSelected;
    });

    // Update parent form control
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.onChange(value || '');
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private searchPlaces(query: string) {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${environment.mapboxAccessToken}&types=poi,place,address&limit=5&country=ph`;
    
    return this.http.get<MapboxGeocodeResponse>(url).pipe(
      catchError(error => {
        console.error('Error searching places:', error);
        return of({ features: [] });
      })
    ).pipe(
      switchMap(response => of(response.features))
    );
  }

  onFocus() {
    // Only open dropdown if we have suggestions and didn't just select a location
    if (this.suggestions.length > 0 && !this.justSelected) {
      this.isOpen = true;
    }
  }

  onBlur() {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => {
      this.isOpen = false;
      this.onTouched();
    }, 200);
  }

  resetJustSelectedFlag() {
    // Reset the flag when user starts typing again
    if (this.justSelected) {
      this.justSelected = false;
    }
  }

  selectSuggestion(suggestion: {place_name: string, center: [number, number]}) {
    const locationData: LocationData = {
      placeName: suggestion.place_name,
      latitude: suggestion.center[1],
      longitude: suggestion.center[0]
    };

    // Set flag to prevent immediate search after selection
    this.justSelected = true;
    
    // Close dropdown immediately
    this.isOpen = false;
    this.suggestions = [];
    
    // Update the input value (this will trigger valueChanges but will be skipped due to justSelected flag)
    this.searchControl.setValue(suggestion.place_name);
    this.onChange(suggestion.place_name);
    this.onTouched();
    
    this.locationSelected.emit(locationData);
  }

  trackBySuggestion(index: number, suggestion: any): string {
    return suggestion.place_name || index.toString();
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    this.searchControl.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
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