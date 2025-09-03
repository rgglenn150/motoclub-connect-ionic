import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PlacesAutocompleteComponent } from './places-autocomplete.component';

@NgModule({
  declarations: [PlacesAutocompleteComponent],
  exports: [PlacesAutocompleteComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ]
})
export class PlacesAutocompleteModule { }