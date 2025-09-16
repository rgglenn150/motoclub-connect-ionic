import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { ImageCropperModule } from 'ngx-image-cropper';
import { MapboxAutocompleteModule } from 'src/app/components/mapbox-autocomplete/mapbox-autocomplete.module';

import { EditClubPageRoutingModule } from './edit-club-routing.module';

import { EditClubPage } from './edit-club.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ImageCropperModule,
    MapboxAutocompleteModule,
    EditClubPageRoutingModule
  ],
  declarations: [EditClubPage]
})
export class EditClubPageModule {}
