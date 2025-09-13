import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { WeatherWidgetComponent } from './weather-widget.component';
import { LocationPreferencesModule } from '../location-preferences/location-preferences.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    LocationPreferencesModule
  ],
  declarations: [
    WeatherWidgetComponent
  ],
  exports: [
    WeatherWidgetComponent
  ]
})
export class WeatherWidgetModule {}