import {
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { MePageModule } from './page/me/me.module';
import { HomePageModule } from './page/home/home.module';
import { RegisterPageModule } from './page/register/register.module';
import { Tab3PageModule } from './tab3/tab3.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreateGroupPageModule } from './page/groups/create-group/create-group.module';
import { Tab1PageModule } from './tab1/tab1.module';
import { Tab2PageModule } from './tab2/tab2.module';
import { RegisterPageRoutingModule } from './page/register/register-routing.module';
import { CreateGroupPageRoutingModule } from './page/groups/create-group/create-group-routing.module';

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
    CreateGroupPageModule,
    CreateGroupPageRoutingModule
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA,NO_ERRORS_SCHEMA],
})
export class AppModule {}
