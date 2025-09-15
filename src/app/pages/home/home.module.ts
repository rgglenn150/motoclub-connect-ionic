import {
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomePageRoutingModule } from './home-routing.module';

import { HomePage } from './home.page';
import { NotificationBellModule } from '../../components/notification-bell/notification-bell.module';
import { WeatherWidgetModule } from '../../components/weather-widget/weather-widget.module';
import { WeatherWidget2Module } from 'src/app/components/weather-widget2/weather-widget2.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    NotificationBellModule,
    WeatherWidgetModule,
    WeatherWidget2Module,
  ],
  exports: [HomePage],
  declarations: [HomePage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class HomePageModule {}
