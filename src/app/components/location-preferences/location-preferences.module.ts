import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { LocationPreferencesComponent } from './location-preferences.component';
import { MapboxAutocompleteModule } from '../mapbox-autocomplete/mapbox-autocomplete.module';

@NgModule({
  declarations: [
    LocationPreferencesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MapboxAutocompleteModule
  ],
  exports: [
    LocationPreferencesComponent
  ]
})
export class LocationPreferencesModule { }