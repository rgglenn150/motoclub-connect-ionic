import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OfficialMemberDetailPage } from './official-member-detail.page';
import { NetworkIndicatorModule } from '../../../components/network-indicator/network-indicator.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NetworkIndicatorModule
  ],
  declarations: [OfficialMemberDetailPage]
})
export class OfficialMemberDetailPageModule {}
