import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ClubHomePageRoutingModule } from './club-home-routing.module';
import { NetworkIndicatorModule } from '../../../components/network-indicator/network-indicator.module';

import { ClubHomePage } from './club-home.page';
import { SharedModule } from '../../../shared/shared.module';

import { CollectionProgressModule } from '../../../components/collection-progress/collection-progress.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClubHomePageRoutingModule,
    NetworkIndicatorModule,
    SharedModule,
    CollectionProgressModule
  ],
  declarations: [ClubHomePage]
})
export class ClubHomePageModule {}
