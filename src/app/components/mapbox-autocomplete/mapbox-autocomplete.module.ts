import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MapboxAutocompleteComponent } from './mapbox-autocomplete.component';

@NgModule({
  declarations: [MapboxAutocompleteComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  exports: [MapboxAutocompleteComponent]
})
export class MapboxAutocompleteModule { }