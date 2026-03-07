import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ClaimRequestsPageRoutingModule } from './claim-requests-routing.module';
import { NetworkIndicatorModule } from '../../components/network-indicator/network-indicator.module';

import { ClaimRequestsPage } from './claim-requests.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClaimRequestsPageRoutingModule,
    NetworkIndicatorModule
  ],
  declarations: [ClaimRequestsPage]
})
export class ClaimRequestsPageModule {}
