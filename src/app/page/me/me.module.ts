import {
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MePageRoutingModule } from './me-routing.module';

import { MePage } from './me.page';
import { ImageCropperModule } from 'ngx-image-cropper';
import { LoadingSpinnerModule } from 'src/app/components/utils/loading-spinner/loading-spinner.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    MePageRoutingModule,
    ImageCropperModule,
    LoadingSpinnerModule,
  ],
  declarations: [MePage],
  exports: [MePage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class MePageModule {}
