import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import player from 'lottie-web';

import { WeatherWidgetComponent } from './weather-widget.component';
import { WeatherSvgIconComponent } from './weather-svg-icons.component';
import { LocationPreferencesModule } from '../location-preferences/location-preferences.module';
import { LottieComponent } from 'ngx-lottie';
export function playerFactory() {
  return player;
}

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    LocationPreferencesModule,
    LottieComponent
  ],
  declarations: [
    WeatherWidgetComponent,
    WeatherSvgIconComponent
  ],
  exports: [
    WeatherWidgetComponent
  ]
})
export class WeatherWidgetModule {}