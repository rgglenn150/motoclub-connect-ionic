import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ClubHomePageRoutingModule } from './club-home-routing.module';

import { ClubHomePage } from './club-home.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClubHomePageRoutingModule
  ],
  declarations: [ClubHomePage]
})
export class ClubHomePageModule {}
