import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherWidget2Component } from './weather-widget2.component';



@NgModule({
  declarations: [WeatherWidget2Component],
  exports: [WeatherWidget2Component],
  imports: [
    CommonModule
  ]
})
export class WeatherWidget2Module { }
