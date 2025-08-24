import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { ImageCropperModule } from 'ngx-image-cropper';


import { CreateClubPage } from './create-club.page';
import { CreateClubPageRoutingModule } from './create-club-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateClubPageRoutingModule,
    ReactiveFormsModule,
    ImageCropperModule
  ],
  declarations: [CreateClubPage],
  exports: [CreateClubPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateClubPageModule {}
