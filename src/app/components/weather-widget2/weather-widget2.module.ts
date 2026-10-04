import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { WeatherWidget2Component } from './weather-widget2.component';
import { WeatherWidgetModule } from '../weather-widget/weather-widget.module';



@NgModule({
  declarations: [WeatherWidget2Component],
  exports: [WeatherWidget2Component],
  imports: [
    CommonModule,
    IonicModule,
    WeatherWidgetModule
  ]
})
export class WeatherWidget2Module { }
