import {
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
  NO_ERRORS_SCHEMA,
  isDevMode,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Import HttpClientModule and the interceptor providers
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TokenInterceptor } from './service/token.interceptor';
import { ErrorInterceptor } from './interceptor/error.interceptor';

import { MePageModule } from './pages/me/me.module';
import { HomePageModule } from './pages/home/home.module';
import { RegisterPageModule } from './pages/register/register.module';
import { Tab3PageModule } from './tab3/tab3.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreateClubPageModule } from './pages/clubs/create-club/create-club.module';
import { Tab1PageModule } from './tab1/tab1.module';
import { Tab2PageModule } from './tab2/tab2.module';
import { RegisterPageRoutingModule } from './pages/register/register-routing.module';
import { CreateClubPageRoutingModule } from './pages/clubs/create-club/create-club-routing.module';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    MePageModule,
    HomePageModule,
    RegisterPageModule,
    RegisterPageRoutingModule,
    Tab1PageModule,
    Tab2PageModule,
    Tab3PageModule,
    FormsModule,
    CreateClubPageModule,
    CreateClubPageRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Add the HTTP_INTERCEPTORS providers here
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class AppModule {}
