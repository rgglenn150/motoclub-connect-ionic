import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { ImageCropperModule } from 'ngx-image-cropper';

import { CreateEventPage } from './create-event.page';
import { CreateEventPageRoutingModule } from './create-event-routing.module';
import { LoadingSpinnerModule } from 'src/app/components/utils/loading-spinner/loading-spinner.module';
import { MapboxAutocompleteModule } from 'src/app/components/mapbox-autocomplete/mapbox-autocomplete.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateEventPageRoutingModule,
    ReactiveFormsModule,
    ImageCropperModule,
    LoadingSpinnerModule,
    MapboxAutocompleteModule
  ],
  declarations: [CreateEventPage],
  exports: [CreateEventPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateEventPageModule {}